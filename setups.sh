#!/bin/bash

# ========================================
# Huglu Full Stack Deployment Script
# API Domain: api.zerodaysoftware.tr
# Admin Domain: hugluadmin.zerodaysoftware.tr
# ========================================

set -e  # Hata durumunda dur

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Değişkenleri
API_DOMAIN="api.zerodaysoftware.tr"
API_DIR="/root/final_versiyonn/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

# Admin Panel Değişkenleri
ADMIN_DOMAIN="hugluadmin.zerodaysoftware.tr"
ADMIN_DIR="/root/final_versiyonn/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

# Genel Değişkenler
EMAIL="holajev397@capiena.com"
WEB_ROOT="/var/www/html"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Huglu Full Stack Deployment Başlıyor ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}API: $API_DOMAIN${NC}"
echo -e "${YELLOW}Admin: $ADMIN_DOMAIN${NC}"
echo ""

# ========================================
# Hata Düzeltme Fonksiyonu
# ========================================
cleanup_and_fix() {
    echo -e "${YELLOW}[FIX] Mevcut konfigürasyonlar temizleniyor...${NC}"
    
    # PM2 işlemlerini durdur
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    
    # Nginx konfigürasyonlarını temizle
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/default
    
    # Port kontrolü ve temizleme
    if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Port $API_PORT temizleniyor...${NC}"
        kill -9 $(lsof -ti:$API_PORT) 2>/dev/null || true
    fi
    
    if lsof -Pi :$ADMIN_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Port $ADMIN_PORT temizleniyor...${NC}"
        kill -9 $(lsof -ti:$ADMIN_PORT) 2>/dev/null || true
    fi
    
    # Nginx'i yeniden başlat
    systemctl restart nginx
    
    echo -e "${GREEN}✓ Temizlik tamamlandı${NC}\n"
    sleep 2
}

# Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script sudo ile çalıştırılmalıdır!${NC}"
    exit 1
fi

# Dizin kontrolleri
if [ ! -d "$API_DIR" ]; then
    echo -e "${RED}Hata: $API_DIR bulunamadı!${NC}"
    exit 1
fi

if [ ! -d "$ADMIN_DIR" ]; then
    echo -e "${RED}Hata: $ADMIN_DIR bulunamadı!${NC}"
    exit 1
fi

# Önce temizlik yap
cleanup_and_fix

# ========================================
# 1. Sistem Güncelleme
# ========================================
echo -e "${GREEN}[1/18] Sistem güncelleniyor...${NC}"
apt update -y
apt install -y net-tools lsof curl
echo -e "${GREEN}✓ Sistem güncellendi${NC}\n"

# ========================================
# 2. Node.js Kurulumu
# ========================================
echo -e "${GREEN}[2/18] Node.js kontrol ediliyor...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js kuruluyor...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js kuruldu${NC}"
else
    echo -e "${YELLOW}✓ Node.js zaten kurulu: $(node --version)${NC}"
fi
echo ""

# ========================================
# 3. Nginx Kurulumu
# ========================================
echo -e "${GREEN}[3/18] Nginx kuruluyor...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install nginx -y
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✓ Nginx kuruldu${NC}"
else
    echo -e "${YELLOW}✓ Nginx zaten kurulu${NC}"
fi
echo ""

# ========================================
# 4. Certbot Kurulumu
# ========================================
echo -e "${GREEN}[4/18] Certbot kuruluyor...${NC}"
if ! command -v certbot &> /dev/null; then
    apt install certbot python3-certbot-nginx -y
    echo -e "${GREEN}✓ Certbot kuruldu${NC}"
else
    echo -e "${YELLOW}✓ Certbot zaten kurulu${NC}"
fi
echo ""

# ========================================
# 5. PM2 Kurulumu
# ========================================
echo -e "${GREEN}[5/18] PM2 kuruluyor...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
    echo -e "${GREEN}✓ PM2 kuruldu${NC}"
else
    echo -e "${YELLOW}✓ PM2 zaten kurulu${NC}"
fi
echo ""

# ========================================
# 6. Web Root Hazırlama
# ========================================
echo -e "${GREEN}[6/18] Web root hazırlanıyor...${NC}"
mkdir -p $WEB_ROOT/.well-known/acme-challenge
chown -R www-data:www-data $WEB_ROOT
chmod -R 755 $WEB_ROOT
echo "certbot-test" > $WEB_ROOT/.well-known/acme-challenge/test.txt
echo -e "${GREEN}✓ Web root hazır${NC}\n"

# ========================================
# 7. API Bağımlılıkları
# ========================================
echo -e "${GREEN}[7/18] API bağımlılıkları kontrol ediliyor...${NC}"
cd $API_DIR
if [ ! -d "node_modules" ]; then
    npm install --production
    echo -e "${GREEN}✓ API bağımlılıkları kuruldu${NC}"
else
    echo -e "${YELLOW}✓ API node_modules mevcut, güncelleniyor...${NC}"
    npm install --production
fi
echo ""

# ========================================
# 8. Admin Panel Bağımlılıkları ve Build
# ========================================
echo -e "${GREEN}[8/18] Admin panel hazırlanıyor...${NC}"
cd $ADMIN_DIR

# node_modules kontrol
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Bağımlılıklar kuruluyor...${NC}"
    npm install
else
    echo -e "${YELLOW}Bağımlılıklar güncelleniyor...${NC}"
    npm install
fi

# Build
echo -e "${YELLOW}Build başlıyor...${NC}"
npm run build
echo -e "${GREEN}✓ Admin panel hazır${NC}\n"

# ========================================
# 9. API PM2 ile Başlatma
# ========================================
echo -e "${GREEN}[9/18] API PM2 ile başlatılıyor...${NC}"
cd $API_DIR

# Eski instance'ı temizle
pm2 delete $API_PM2_NAME 2>/dev/null || true
sleep 2

# Yeni instance başlat
pm2 start server.js \
    --name $API_PM2_NAME \
    --time \
    --log-date-format="YYYY-MM-DD HH:mm:ss" \
    --max-memory-restart 500M

pm2 save

sleep 3

# Port kontrolü
if netstat -tulpn | grep -q ":$API_PORT"; then
    echo -e "${GREEN}✓ API Port $API_PORT aktif${NC}"
else
    echo -e "${RED}✗ API Port $API_PORT açık değil!${NC}"
    echo -e "${YELLOW}API Logları:${NC}"
    pm2 logs $API_PM2_NAME --lines 20 --nostream
    exit 1
fi
echo ""

# ========================================
# 10. Admin Panel PM2 ile Başlatma
# ========================================
echo -e "${GREEN}[10/18] Admin panel PM2 ile başlatılıyor...${NC}"
cd $ADMIN_DIR

# Eski instance'ı temizle
pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
sleep 2

# Yeni instance başlat
pm2 start npm \
    --name "$ADMIN_PM2_NAME" \
    -- start \
    --time \
    --log-date-format="YYYY-MM-DD HH:mm:ss" \
    --max-memory-restart 500M

pm2 save

sleep 3

# Port kontrolü
if netstat -tulpn | grep -q ":$ADMIN_PORT"; then
    echo -e "${GREEN}✓ Admin Port $ADMIN_PORT aktif${NC}"
else
    echo -e "${RED}✗ Admin Port $ADMIN_PORT açık değil!${NC}"
    echo -e "${YELLOW}Admin Logları:${NC}"
    pm2 logs $ADMIN_PM2_NAME --lines 20 --nostream
    exit 1
fi
echo ""

# ========================================
# 11. Nginx - API Konfigürasyonu
# ========================================
echo -e "${GREEN}[11/18] Nginx API yapılandırması...${NC}"

cat > /etc/nginx/sites-available/$API_DOMAIN <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.zerodaysoftware.tr;

    # Let's Encrypt için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Reverse proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    client_max_body_size 50M;

    access_log /var/log/nginx/api.zerodaysoftware.tr.access.log;
    error_log /var/log/nginx/api.zerodaysoftware.tr.error.log;
}
EOF

ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ API Nginx config oluşturuldu${NC}\n"

# ========================================
# 12. Nginx - Admin Panel Konfigürasyonu
# ========================================
echo -e "${GREEN}[12/18] Nginx Admin Panel yapılandırması...${NC}"

cat > /etc/nginx/sites-available/$ADMIN_DOMAIN <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name hugluadmin.zerodaysoftware.tr;

    # Let's Encrypt için
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Next.js için özel ayarlar
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    client_max_body_size 50M;

    access_log /var/log/nginx/hugluadmin.zerodaysoftware.tr.access.log;
    error_log /var/log/nginx/hugluadmin.zerodaysoftware.tr.error.log;
}
EOF

ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Admin Nginx config oluşturuldu${NC}\n"

# ========================================
# 13. Nginx Test ve Restart
# ========================================
echo -e "${GREEN}[13/18] Nginx test ediliyor...${NC}"

# Default config'i devre dışı bırak
rm -f /etc/nginx/sites-enabled/default

# Nginx test
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx konfigürasyonu başarılı${NC}"
    systemctl reload nginx
    sleep 2
else
    echo -e "${RED}✗ Nginx konfigürasyon hatası!${NC}"
    nginx -t
    exit 1
fi
echo ""

# ========================================
# 14. HTTP Testleri
# ========================================
echo -e "${GREEN}[14/18] HTTP bağlantıları test ediliyor...${NC}"
sleep 2

# API Test
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://$API_DOMAIN/ 2>/dev/null || echo "FAIL")
echo -e "  API HTTP: $API_TEST"

# Admin Test
ADMIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://$ADMIN_DOMAIN/ 2>/dev/null || echo "FAIL")
echo -e "  Admin HTTP: $ADMIN_TEST"
echo ""

# ========================================
# 15. SSL Sertifikası - API
# ========================================
echo -e "${GREEN}[15/18] API SSL sertifikası kuruluyor...${NC}"
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ API SSL kuruldu${NC}"
    sleep 2
    HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://$API_DOMAIN/ 2>/dev/null || echo "FAIL")
    echo -e "${GREEN}  HTTPS Test: $HTTPS_TEST${NC}"
else
    echo -e "${YELLOW}⚠ API SSL kurulumu başarısız (DNS propagation beklenebilir)${NC}"
fi
echo ""

# ========================================
# 16. SSL Sertifikası - Admin Panel
# ========================================
echo -e "${GREEN}[16/18] Admin Panel SSL sertifikası kuruluyor...${NC}"
certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Admin Panel SSL kuruldu${NC}"
    sleep 2
    HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://$ADMIN_DOMAIN/ 2>/dev/null || echo "FAIL")
    echo -e "${GREEN}  HTTPS Test: $HTTPS_TEST${NC}"
else
    echo -e "${YELLOW}⚠ Admin Panel SSL kurulumu başarısız (DNS propagation beklenebilir)${NC}"
fi
echo ""

# ========================================
# 17. SSL Otomatik Yenileme
# ========================================
echo -e "${GREEN}[17/18] SSL otomatik yenileme ayarlanıyor...${NC}"

CRON_JOB="0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx' >> /var/log/certbot-renew.log 2>&1"

(crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✓ SSL otomatik yenileme ayarlandı (Her gün 03:00)${NC}\n"

# ========================================
# 18. Firewall
# ========================================
echo -e "${GREEN}[18/18] Firewall ayarlanıyor...${NC}"

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    ufw --force enable
    echo -e "${GREEN}✓ Firewall kuralları uygulandı${NC}"
else
    echo -e "${YELLOW}⚠ UFW bulunamadı, firewall atlandı${NC}"
fi
echo ""

# ========================================
# Ollama Kurulumu (İsteğe Bağlı)
# ========================================
echo -e "${GREEN}[BONUS] Ollama kuruluyor...${NC}"
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✓ Ollama kuruldu${NC}"
    
    # Model indir (arkaplanda)
    echo -e "${YELLOW}Ollama modeli indiriliyor (bu biraz zaman alabilir)...${NC}"
    ollama pull llama3.2:3b
    echo -e "${GREEN}✓ Ollama model hazır${NC}"
else
    echo -e "${YELLOW}✓ Ollama zaten kurulu${NC}"
fi
echo ""

# ========================================
# Tamamlama Raporu
# ========================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Full Stack Deployment Tamamlandı!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# SSL kontrolleri
API_SSL="http"
ADMIN_SSL="http"

if certbot certificates 2>/dev/null | grep -q "$API_DOMAIN"; then
    API_SSL="https"
fi

if certbot certificates 2>/dev/null | grep -q "$ADMIN_DOMAIN"; then
    ADMIN_SSL="https"
fi

echo -e "${YELLOW}📋 Kurulum Bilgileri:${NC}"
echo -e "  ${GREEN}API: ${API_SSL}://$API_DOMAIN${NC}"
echo -e "  ${GREEN}Admin Panel: ${ADMIN_SSL}://$ADMIN_DOMAIN${NC}"
echo ""

echo -e "${YELLOW}🔧 PM2 Komutları:${NC}"
echo -e "  Durum: ${GREEN}pm2 status${NC}"
echo -e "  API Loglar: ${GREEN}pm2 logs $API_PM2_NAME${NC}"
echo -e "  Admin Loglar: ${GREEN}pm2 logs $ADMIN_PM2_NAME${NC}"
echo -e "  Yeniden başlat: ${GREEN}pm2 restart all${NC}"
echo -e "  Monitoring: ${GREEN}pm2 monit${NC}"
echo ""

echo -e "${YELLOW}🌐 Nginx Komutları:${NC}"
echo -e "  Test: ${GREEN}nginx -t${NC}"
echo -e "  Reload: ${GREEN}systemctl reload nginx${NC}"
echo -e "  Loglar: ${GREEN}tail -f /var/log/nginx/*.log${NC}"
echo ""

echo -e "${YELLOW}🔒 SSL Bilgileri:${NC}"
echo -e "  Sertifikalar: ${GREEN}certbot certificates${NC}"
echo -e "  Yenileme testi: ${GREEN}certbot renew --dry-run${NC}"
echo ""

echo -e "${YELLOW}🔧 Sorun Giderme:${NC}"
echo -e "  Script'i tekrar çalıştırın: ${GREEN}bash $(basename $0)${NC}"
echo -e "  Port kontrolü: ${GREEN}netstat -tulpn | grep -E ':(3000|3001)'${NC}"
echo -e "  İşlem kontrolü: ${GREEN}ps aux | grep node${NC}"
echo ""

echo -e "${GREEN}✅ Sistemleriniz çalışıyor ve hazır!${NC}"
echo ""