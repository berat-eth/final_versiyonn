const { Queue, Worker, QueueScheduler, JobsOptions } = require('bullmq');
const { createClient } = require('redis');

const connection = (() => {
  try {
    if (global && global.redis) return global.redis;
  } catch (_) {}
  const url = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://127.0.0.1:6379';
  const client = createClient({ url });
  client.on('error', (err) => console.error('Redis error:', err.message));
  client.connect().catch(() => {});
  return client;
})();

const queueName = 'gmaps-scrape';

const queue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 }
  }
});

const scheduler = new QueueScheduler(queueName, { connection });

module.exports = { queue, scheduler, connection, queueName };


