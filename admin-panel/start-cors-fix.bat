@echo off
echo 🚀 Huğlu Outdoor Admin Panel - CORS Fix
echo ========================================

echo 📦 Dependencies installing...
npm install

echo 🔧 Starting CORS Fix Server...
echo 🌐 Admin Panel: http://localhost:8081
echo 🔑 API Key: X-API-Key header kullanın
echo 🌐 Backend API: http://213.142.159.135:3000/api
echo ✅ CORS kısıtlamaları kaldırıldı
echo.

node cors-fix.js

pause
