#!/usr/bin/env node
/**
 * CORS Fix Script for Admin Panel
 * Bu script admin paneli için CORS sorunlarını çözer
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8081; // Admin paneli için ayrı port

// Tüm CORS kısıtlamalarını kaldır
app.use(cors({
  origin: '*', // Tüm origin'lere izin ver
  credentials: false, // Admin paneli için credentials gerekmez
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: '*', // Tüm başlıklara izin ver
  exposedHeaders: '*', // Tüm başlıkları expose et
  optionsSuccessStatus: 200 // Legacy browser desteği
}));

// Tüm istekler için CORS başlıkları ekle
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  res.header('Access-Control-Max-Age', '86400'); // 24 saat cache
  
  // OPTIONS istekleri için hızlı yanıt
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Static dosyaları serve et
app.use(express.static(path.join(__dirname)));

// Admin paneli ana sayfası
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Login sayfası
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// API proxy - Backend'e yönlendir
app.use('/api', (req, res) => {
  const backendUrl = 'http://213.142.159.135:3000/api';
  const targetUrl = `${backendUrl}${req.path}`;
  
  // CORS başlıklarını ekle
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  
  // Basit proxy (gerçek implementasyon için http-proxy-middleware kullanılabilir)
  res.status(200).json({
    message: 'Admin paneli CORS fix aktif',
    targetUrl: targetUrl,
    method: req.method,
    headers: req.headers
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Admin Panel Error:', err);
  res.status(500).json({
    error: 'Admin paneli hatası',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Sayfa bulunamadı',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log('🚀 Admin Panel CORS Fix Server');
  console.log(`📱 Server running at: http://localhost:${PORT}`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}`);
  console.log(`🌐 Backend API: http://213.142.159.135:3000/api`);
  console.log('✅ CORS kısıtlamaları kaldırıldı');
  console.log('🌐 Tüm origin\'lere erişim açık');
});
