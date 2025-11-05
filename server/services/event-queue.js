const { getClient } = require('../redis');

/**
 * Event Queue Service
 * Redis Streams veya Bull Queue ile yüksek trafik desteği
 */
class EventQueueService {
  constructor() {
    this.client = null;
    this.streamName = 'user-behavior-events';
    this.consumerGroup = 'behavior-processors';
    this.maxLen = 10000; // Stream'de maksimum 10000 entry
    this.retryDelay = 5000; // 5 saniye retry delay
    this.maxRetries = 3;
  }

  /**
   * Redis client'ı initialize et
   */
  async initialize() {
    try {
      this.client = getClient();
      if (!this.client) {
        console.warn('⚠️ Redis client not available, event queue will use in-memory fallback');
        return false;
      }

      // Consumer group oluştur (yoksa)
      // ioredis API: xgroup('CREATE', stream, group, id, 'MKSTREAM')
      try {
        await this.client.xgroup('CREATE', this.streamName, this.consumerGroup, '0', 'MKSTREAM');
      } catch (error) {
        // Group zaten varsa hata verme
        if (!error.message.includes('BUSYGROUP') && !error.message.includes('BUSY GROUP')) {
          throw error;
        }
      }

      console.log('✅ Event Queue Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Event Queue initialization error:', error);
      return false;
    }
  }

  /**
   * Event'i queue'ya ekle
   */
  async enqueue(eventData) {
    try {
      if (!this.client) {
        // Fallback: direkt processor'a gönder
        return { success: false, error: 'Redis not available' };
      }

      const eventPayload = {
        userId: eventData.userId || null,
        deviceId: eventData.deviceId,
        eventType: eventData.eventType,
        screenName: eventData.screenName || null,
        eventData: JSON.stringify(eventData.eventData || {}),
        sessionId: eventData.sessionId || null,
        ipAddress: eventData.ipAddress || null,
        userAgent: eventData.userAgent || null,
        timestamp: eventData.timestamp || new Date().toISOString(),
        retries: 0
      };

      // Redis Stream'e ekle
      // ioredis API: xadd(stream, '*', field1, value1, field2, value2, ...)
      const fields = [];
      Object.entries(eventPayload).forEach(([key, value]) => {
        fields.push(key, String(value));
      });
      
      const messageId = await this.client.xadd(
        this.streamName,
        '*',
        ...fields,
        'MAXLEN', '~', this.maxLen.toString() // ~ = approximate
      );

      return { success: true, messageId };
    } catch (error) {
      console.error('❌ Event queue enqueue error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Event'leri queue'dan al ve işle (worker process)
   */
  async processEvents(count = 10, processor) {
    try {
      if (!this.client || !processor) {
        return { success: false, error: 'Redis client or processor not available' };
      }

      // Stream'den event'leri al
      // ioredis API: xreadgroup('GROUP', group, consumer, 'COUNT', count, 'BLOCK', ms, 'STREAMS', stream, id)
      const messages = await this.client.xreadgroup(
        'GROUP', this.consumerGroup,
        'worker-1', // Consumer name
        'COUNT', count,
        'BLOCK', 1000, // 1 saniye block
        'STREAMS', this.streamName, '>'
      );

      if (!messages || messages.length === 0) {
        return { success: true, processed: 0 };
      }

      // ioredis xreadgroup formatı: [[streamName, [[id, [field1, value1, field2, value2, ...]]]]]
      const streamMessages = messages[0]?.[1] || [];
      let processed = 0;
      let failed = 0;

      // Her event'i işle
      for (const message of streamMessages) {
        try {
          // ioredis message formatı: [id, [field1, value1, field2, value2, ...]]
          const messageId = message[0];
          const fields = message[1];
          
          // Field array'ini object'e çevir
          const messageData = {};
          for (let i = 0; i < fields.length; i += 2) {
            messageData[fields[i]] = fields[i + 1];
          }
          
          const eventData = {
            userId: messageData.userId ? parseInt(messageData.userId) : null,
            deviceId: messageData.deviceId,
            eventType: messageData.eventType,
            screenName: messageData.screenName || null,
            eventData: JSON.parse(messageData.eventData || '{}'),
            sessionId: messageData.sessionId || null,
            ipAddress: messageData.ipAddress || null,
            userAgent: messageData.userAgent || null,
            timestamp: messageData.timestamp
          };
          
          // Message ID'yi sakla
          eventData._messageId = messageId;

          // Processor'a gönder
          const result = await processor.processEvent(eventData);

          if (result.success) {
            // Başarılı - mesajı ack et
            // ioredis API: xack(stream, group, ...ids)
            await this.client.xack(this.streamName, this.consumerGroup, eventData._messageId);
            processed++;
          } else {
            // Başarısız - retry logic
            const retries = parseInt(messageData.retries || 0);
            if (retries < this.maxRetries) {
              // Retry için event'i tekrar ekle
              await this.enqueue({
                ...eventData,
                retries: retries + 1
              });
              await this.client.xack(this.streamName, this.consumerGroup, eventData._messageId);
            } else {
              // Max retry aşıldı - dead letter queue'ya gönder
              await this.moveToDeadLetterQueue({ id: eventData._messageId, message: messageData });
              await this.client.xack(this.streamName, this.consumerGroup, eventData._messageId);
              failed++;
            }
          }
        } catch (error) {
          console.error('❌ Event processing error:', error);
          // Dead letter queue'ya gönder
          const messageId = message[0];
          const fields = message[1] || [];
          const failedMessageData = {};
          for (let i = 0; i < fields.length; i += 2) {
            failedMessageData[fields[i]] = fields[i + 1];
          }
          await this.moveToDeadLetterQueue({ id: messageId, message: failedMessageData }).catch(() => {});
          await this.client.xack(this.streamName, this.consumerGroup, messageId).catch(() => {});
          failed++;
        }
      }

      return { success: true, processed, failed };
    } catch (error) {
      console.error('❌ Process events error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Dead letter queue'ya gönder (başarısız event'ler için)
   */
  async moveToDeadLetterQueue(message) {
    try {
      if (!this.client) return;

      const dlqStreamName = `${this.streamName}:dlq`;
      const dlqFields = [];
      Object.entries(message.message).forEach(([key, value]) => {
        dlqFields.push(key, String(value));
      });
      dlqFields.push('failedAt', new Date().toISOString());
      dlqFields.push('originalId', message.id);
      
      await this.client.xadd(dlqStreamName, '*', ...dlqFields);
    } catch (error) {
      console.error('❌ Dead letter queue error:', error);
    }
  }

  /**
   * Queue size'ı getir
   */
  async getQueueSize() {
    try {
      if (!this.client) return 0;

      // ioredis API: xinfo('STREAM', stream) - array döner, length field'ı var
      const info = await this.client.xinfo('STREAM', this.streamName);
      // info formatı: ['length', 5, 'first-entry', ...]
      const lengthIndex = info.indexOf('length');
      return lengthIndex >= 0 && lengthIndex + 1 < info.length ? info[lengthIndex + 1] : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Pending messages'ı getir
   */
  async getPendingMessages() {
    try {
      if (!this.client) return [];

      // ioredis API: xpending(stream, group)
      const pending = await this.client.xpending(this.streamName, this.consumerGroup);
      return pending || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Worker'ı başlat (sürekli çalışan)
   */
  startWorker(processor, interval = 1000) {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }

    this.workerInterval = setInterval(async () => {
      await this.processEvents(10, processor);
    }, interval);

    console.log('✅ Event Queue Worker started');
  }

  /**
   * Worker'ı durdur
   */
  stopWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      console.log('✅ Event Queue Worker stopped');
    }
  }
}

// Singleton instance
let instance = null;

module.exports = function getEventQueue() {
  if (!instance) {
    instance = new EventQueueService();
  }
  return instance;
};

module.exports.EventQueueService = EventQueueService;

