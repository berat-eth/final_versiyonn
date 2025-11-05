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
      try {
        await this.client.xGroup('CREATE', this.streamName, this.consumerGroup, '0', {
          MKSTREAM: true
        });
      } catch (error) {
        // Group zaten varsa hata verme
        if (!error.message.includes('BUSYGROUP')) {
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
      const messageId = await this.client.xAdd(
        this.streamName,
        '*',
        eventPayload,
        {
          MAXLEN: this.maxLen,
          APPROX: true // Yaklaşık uzunluk (performans için)
        }
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
      const messages = await this.client.xReadGroup(
        this.consumerGroup,
        'worker-1', // Consumer name
        [
          {
            key: this.streamName,
            id: '>'
          }
        ],
        {
          COUNT: count,
          BLOCK: 1000 // 1 saniye block
        }
      );

      if (!messages || messages.length === 0) {
        return { success: true, processed: 0 };
      }

      const streamMessages = messages[0]?.messages || [];
      let processed = 0;
      let failed = 0;

      // Her event'i işle
      for (const message of streamMessages) {
        try {
          const eventData = {
            userId: message.message.userId ? parseInt(message.message.userId) : null,
            deviceId: message.message.deviceId,
            eventType: message.message.eventType,
            screenName: message.message.screenName || null,
            eventData: JSON.parse(message.message.eventData || '{}'),
            sessionId: message.message.sessionId || null,
            ipAddress: message.message.ipAddress || null,
            userAgent: message.message.userAgent || null,
            timestamp: message.message.timestamp
          };

          // Processor'a gönder
          const result = await processor.processEvent(eventData);

          if (result.success) {
            // Başarılı - mesajı sil
            await this.client.xAck(this.streamName, this.consumerGroup, message.id);
            processed++;
          } else {
            // Başarısız - retry logic
            const retries = parseInt(message.message.retries || 0);
            if (retries < this.maxRetries) {
              // Retry için event'i tekrar ekle
              await this.enqueue({
                ...eventData,
                retries: retries + 1
              });
              await this.client.xAck(this.streamName, this.consumerGroup, message.id);
            } else {
              // Max retry aşıldı - dead letter queue'ya gönder
              await this.moveToDeadLetterQueue(message);
              await this.client.xAck(this.streamName, this.consumerGroup, message.id);
              failed++;
            }
          }
        } catch (error) {
          console.error('❌ Event processing error:', error);
          // Dead letter queue'ya gönder
          await this.moveToDeadLetterQueue(message).catch(() => {});
          await this.client.xAck(this.streamName, this.consumerGroup, message.id).catch(() => {});
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
      await this.client.xAdd(dlqStreamName, '*', {
        ...message.message,
        failedAt: new Date().toISOString(),
        originalId: message.id
      });
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

      const info = await this.client.xInfo('STREAM', this.streamName);
      return info.length || 0;
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

      const pending = await this.client.xPending(this.streamName, this.consumerGroup);
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

