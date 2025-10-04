#!/bin/bash
echo "🚀 Huğlu Outdoor Admin Panel Başlatılıyor..."
echo "=========================================="

cd admin-panel

echo "📦 Dependencies kontrol ediliyor..."
if [ ! -d "node_modules" ]; then
    echo "📥 Dependencies yükleniyor..."
    npm install
fi

echo "🔧 CORS Fix Server başlatılıyor..."
echo "🌐 Admin Panel: http://localhost:8081"
echo "🔑 API Key: X-API-Key header kullanın"
echo "🌐 Backend API: http://213.142.159.135:3000/api"
echo "✅ CORS kısıtlamaları kaldırıldı"
echo ""

node cors-fix.js
