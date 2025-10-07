// Lightweight Redis helpers. Uses global.redis if available; fails safe otherwise.
const crypto = require('crypto');

function getClient() {
  try {
    if (global && global.redis && typeof global.redis.get === 'function') {
      return global.redis;
    }
  } catch (_) {}
  return null;
}

async function getJson(key) {
  try {
    const client = getClient();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

async function setJsonEx(key, ttlSeconds, value) {
  try {
    const client = getClient();
    if (!client) return;
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (_) {}
}

async function delKey(key) {
  try {
    const client = getClient();
    if (!client) return;
    await client.del(key);
  } catch (_) {}
}

async function withLock(lockKey, ttlSeconds, fn) {
  const client = getClient();
  if (!client) return fn();
  try {
    const ok = await client.set(lockKey, '1', { NX: true, EX: ttlSeconds });
    if (!ok) return; // another worker holds the lock
    try {
      await fn();
    } finally {
      try { await client.del(lockKey); } catch (_) {}
    }
  } catch (_) {}
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

module.exports = {
  getJson,
  setJsonEx,
  delKey,
  withLock,
  sha256
};


