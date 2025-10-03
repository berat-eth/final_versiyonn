#!/usr/bin/env node
/*
  API Benchmark & Security Audit Script
  - Hız: DNS/TCP/TLS/Request/TTFB/Download/Total süreleri
  - Güvenlik: Ortak HTTP güvenlik başlıkları, CORS, TLS versiyon & cipher
  - Sonuç: p50/p95 ve özet tablo

  Kullanım:
    node scripts/api-benchmark-security.js --base https://api.zerodaysoftware.tr/api \
      --apiKey <KEY> --tenantId 1 --runs 3 --timeout 20000

  Not: Uygulamaya dahil değildir. Geçici test için yazılmıştır.
*/

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { performance } = require('perf_hooks');

// ----------- CLI ARGS -----------
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return process.env[name.toUpperCase()] || def;
  const eq = args[idx].indexOf('=');
  if (eq !== -1) return args[idx].slice(eq + 1);
  return args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : true;
}

const BASE = (getArg('base', 'https://api.zerodaysoftware.tr/api') || '').replace(/\/$/, '');
const API_KEY = getArg('apiKey', '') || '';
const TENANT_ID = getArg('tenantId', '1');
const RUNS = parseInt(getArg('runs', '3'), 10) || 3;
const TIMEOUT_MS = parseInt(getArg('timeout', '20000'), 10) || 20000;
const KEEPALIVE = getArg('keepAlive', 'false') === 'true';

function maskSecret(v) {
  if (!v) return '';
  if (v.length <= 10) return v[0] + '***' + v[v.length - 1];
  return v.slice(0, 6) + '***' + v.slice(-4);
}

// ----------- ENDPOINTS -----------
const ENDPOINTS = [
  ['Health', 'GET', '/health'],
  ['Products list', 'GET', '/products'],
  ['Products search q=a', 'GET', '/products/search?q=a'],
  ['Price range', 'GET', '/products/price-range'],
  ['Categories', 'GET', '/categories'],
  ['Brands', 'GET', '/brands'],
  ['Campaigns', 'GET', '/campaigns'],
  ['Chatbot FAQ', 'GET', '/chatbot/faq'],
];

// ----------- TIMING REQUEST -----------
function requestWithTimings(method, fullUrl, headers = {}, body = null, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const url = new URL(fullUrl);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : http;

    const timings = {
      start: performance.now(),
      dnsStart: null, dnsEnd: null,
      tcpStart: null, tcpEnd: null,
      tlsStart: null, tlsEnd: null,
      requestStart: null, firstByte: null,
      downloadEnd: null,
    };

    const agent = new (isHttps ? https.Agent : http.Agent)({ keepAlive: KEEPALIVE });

    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ''),
      method,
      headers,
      agent,
    };

    let timeoutHandle = null;
    const req = mod.request(options, (res) => {
      if (timings.firstByte === null) timings.firstByte = performance.now();
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        timings.downloadEnd = performance.now();
        const raw = Buffer.concat(chunks);
        const contentType = String(res.headers['content-type'] || '');
        let parsed = null;
        try {
          parsed = contentType.includes('application/json') ? JSON.parse(raw.toString('utf8')) : raw.toString('utf8');
        } catch {
          parsed = raw.toString('utf8');
        }

        const tlsInfo = {};
        const socket = res.socket;
        if (socket && socket.getProtocol) {
          try { tlsInfo.protocol = socket.getProtocol(); } catch {}
        }
        if (socket && socket.getCipher) {
          try { tlsInfo.cipher = socket.getCipher(); } catch {}
        }

        clearTimeout(timeoutHandle);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          timings,
          tlsInfo,
        });
      });
    });

    req.on('socket', (socket) => {
      // DNS timing is not directly exposed per-request; treat connect as tcpStart
      timings.tcpStart = performance.now();
      socket.on('lookup', () => {
        timings.dnsStart = timings.dnsStart || performance.now();
        timings.dnsEnd = performance.now();
      });
      socket.on('connect', () => {
        timings.tcpEnd = performance.now();
      });
      socket.on('secureConnect', () => {
        timings.tlsStart = timings.tlsStart || timings.tcpEnd || performance.now();
        timings.tlsEnd = performance.now();
      });
    });

    req.on('finish', () => {
      if (timings.requestStart === null) timings.requestStart = performance.now();
    });

    req.on('error', (err) => {
      clearTimeout(timeoutHandle);
      resolve({ ok: false, error: err, timings });
    });

    timeoutHandle = setTimeout(() => {
      try { req.destroy(new Error('Timeout')); } catch {}
    }, timeoutMs);

    if (body) {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(data);
    }
    req.end();
  });
}

// ----------- SECURITY CHECKS -----------
function analyzeSecurityHeaders(headers) {
  const h = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const checks = [];
  function push(name, ok, note) { checks.push({ name, ok, note }); }

  push('Strict-Transport-Security', Boolean(h['strict-transport-security']), 'HSTS koruması önerilir');
  push('X-Content-Type-Options', h['x-content-type-options'] === 'nosniff', 'nosniff olmalı');
  push('X-Frame-Options', ['deny', 'sameorigin'].includes(String(h['x-frame-options'] || '').toLowerCase()), 'DENY veya SAMEORIGIN olmalı');
  push('Referrer-Policy', Boolean(h['referrer-policy']), 'Referrer-Policy ekleyin');
  push('Content-Security-Policy', Boolean(h['content-security-policy']), 'CSP ekleyin');
  push('Permissions-Policy', Boolean(h['permissions-policy']), 'Permissions-Policy ekleyin');
  // CORS
  push('CORS: Access-Control-Allow-Origin', Boolean(h['access-control-allow-origin']), 'Gereken origin için ayarlayın');

  return checks;
}

function ms(n) { return Math.round(n); }
function pct(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function runOnce(name, method, path) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(TENANT_ID ? { 'X-Tenant-Id': TENANT_ID } : {}),
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
  };
  const res = await requestWithTimings(method, `${BASE}${path}`, headers, null, TIMEOUT_MS);
  const t = res.timings;
  const out = {
    ok: res.ok,
    status: res.status,
    durations: {
      dns: t.dnsStart && t.dnsEnd ? ms(t.dnsEnd - t.dnsStart) : null,
      tcp: t.tcpStart && t.tcpEnd ? ms(t.tcpEnd - t.tcpStart) : null,
      tls: t.tlsStart && t.tlsEnd ? ms(t.tlsEnd - t.tlsStart) : null,
      ttfb: t.firstByte ? ms(t.firstByte - (t.requestStart || t.start)) : null,
      download: t.firstByte && t.downloadEnd ? ms(t.downloadEnd - t.firstByte) : null,
      total: t.downloadEnd ? ms(t.downloadEnd - t.start) : null,
    },
    tls: res.tlsInfo || {},
    security: analyzeSecurityHeaders(res.headers),
  };
  return out;
}

async function main() {
  console.log('🔎 API Benchmark & Security Audit başlıyor...');
  console.log(`Base: ${BASE}`);
  if (API_KEY) console.log(`API Key: ${maskSecret(API_KEY)}`);
  if (TENANT_ID) console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Runs: ${RUNS}, Timeout: ${TIMEOUT_MS}ms, KeepAlive: ${KEEPALIVE}`);

  const results = {};
  for (const [name, method, path] of ENDPOINTS) {
    results[path] = [];
    // Warm-up
    await runOnce(name, method, path).catch(() => {});
    for (let i = 0; i < RUNS; i++) {
      const r = await runOnce(name, method, path);
      results[path].push(r);
      const last = r.durations;
      console.log(`  ${name} ${method} ${path} → total=${last.total}ms ttfb=${last.ttfb}ms (dns=${last.dns} tcp=${last.tcp} tls=${last.tls} dl=${last.download}) status=${r.status}`);
    }
  }

  console.log('\n🧾 Özet (p50/p95)');
  const rows = [];
  for (const [name, method, path] of ENDPOINTS) {
    const arr = results[path] || [];
    const totals = arr.map(a => a.durations.total || 0).filter(Boolean);
    const ttfbs = arr.map(a => a.durations.ttfb || 0).filter(Boolean);
    rows.push({
      name, path,
      p50_total: ms(pct(totals, 50)),
      p95_total: ms(pct(totals, 95)),
      p50_ttfb: ms(pct(ttfbs, 50)),
      p95_ttfb: ms(pct(ttfbs, 95)),
      sample: totals.length,
    });
  }
  rows.forEach(r => {
    console.log(`  ${r.name.padEnd(20)} ${r.path.padEnd(28)} total p50=${r.p50_total} p95=${r.p95_total} | ttfb p50=${r.p50_ttfb} p95=${r.p95_ttfb} (n=${r.sample})`);
  });

  console.log('\n🔐 Güvenlik Başlıkları Kontrolü (son koşudan)');
  for (const [name, method, path] of ENDPOINTS) {
    const arr = results[path] || [];
    if (!arr.length) continue;
    const last = arr[arr.length - 1];
    const sec = last.security;
    const tls = last.tls;
    console.log(`  ${name} ${path} status=${last.status} TLS=${(tls && (tls.protocol || '')) || '-'} cipher=${(tls && tls.cipher && tls.cipher.name) || '-'}`);
    sec.forEach(c => {
      console.log(`    ${c.ok ? '✅' : '⚠️'} ${c.name}${c.ok ? '' : ' → ' + c.note}`);
    });
  }

  console.log('\n📌 Yorumlar');
  console.log('- TTFB yüksekse: sunucu gecikmesi olasıdır.');
  console.log('- DNS/TCP/TLS süreleri yüksekse: ağ/konum/sertifika el sıkışması etkisi olabilir.');
  console.log('- Total ≫ TTFB ise: yanıt boyutu/bant genişliği veya sıkıştırma etkili olabilir.');
}

main().catch(err => {
  console.error('Top-level error:', err);
  process.exit(1);
});


