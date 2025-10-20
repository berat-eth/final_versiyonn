#!/bin/bash

# ========================================
# Huglu + N8N Full Stack Deployment Script
# Domains:
#   API: api.zerodaysoftware.tr
#   Admin: hugluadmin.zerodaysoftware.tr
#   N8N: otomasyon.zerodaysoftware.tr
# ========================================

set -e

# --------------------------
# Renkler
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --------------------------
# Değişkenler
# --------------------------
API_DOMAIN="api.plaxsy.com"
API_DIR="/root/final_versiyonn/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

ADMIN_DOMAIN="admin.plaxsy.com"
ADMIN_DIR="/root/final_versiyonn/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

N8N_DOMAIN="otomasyon.plaxsy.com"
N8N_PORT=5678
N8N_USER=$(whoami)
N8N_DIR="/home/$N8N_USER/n8n"

EMAIL="berat@beratsimsek.com.tr"

WEB_ROOT="/var/www/html"

ERRORS=0
WARNINGS=0
SKIP_ADMIN=false

# --------------------------
# Root kontrolü
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script root olarak çalıştırılmalıdır!${NC}"
    exit 1
fi

# --------------------------
# Temizlik fonksiyonu
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[FIX] Mevcut PM2 ve Nginx konfigürasyonları temizleniyor...${NC}"
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    pm2 delete n8n 2>/dev/null || true

    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/n8n
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/n8n
    rm -f /etc/nginx/sites-enabled/default
}

cleanup_and_fix

# --------------------------
# Sistem güncelleme ve paketler
# --------------------------
apt update -y && apt upgrade -y
apt install -y net-tools lsof curl wget git nginx ufw build-essential python3-certbot-nginx

# --------------------------
# Node.js ve PM2
# --------------------------
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
npm install -g pm2

# --------------------------
# Repo klonlama ve dizin kontrol
# --------------------------
if [ ! -d "/root/final_versiyonn" ]; then
    git clone https://github.com/berat-eth/final_versiyonn.git /root/final_versiyonn
fi

# --------------------------
# API Kurulumu
# --------------------------
if [ -d "$API_DIR" ]; then
    cd $API_DIR
    npm install --production
    pm2 start server.js --name $API_PM2_NAME --time --log-date-format="YYYY-MM-DD HH:mm:ss" --max-memory-restart 500M
    pm2 save
fi

# --------------------------
# Admin Panel Kurulumu
# --------------------------
if [ -d "$ADMIN_DIR" ]; then
    cd $ADMIN_DIR
    npm install
    npm run build
    PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
    pm2 save
else
    SKIP_ADMIN=true
fi

# --------------------------
# N8N Kurulumu
# --------------------------
if ! command -v n8n &>/dev/null; then
    npm install -g n8n
fi
mkdir -p $N8N_DIR/logs
chown -R $N8N_USER:$N8N_USER $N8N_DIR

cat > $N8N_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'n8n',
    script: '$(which n8n)',
    args: 'start',
    interpreter: 'none',
    cwd: '${N8N_DIR}',
    env: {
      N8N_HOST: '${N8N_DOMAIN}',
      N8N_PORT: ${N8N_PORT},
      N8N_PROTOCOL: 'https',
      WEBHOOK_URL: 'https://${N8N_DOMAIN}/',
      N8N_EDITOR_BASE_URL: 'https://${N8N_DOMAIN}/',
      GENERIC_TIMEZONE: 'Europe/Istanbul',
      NODE_ENV: 'production',
      N8N_LOG_LEVEL: 'info',
      N8N_USER_FOLDER: '${N8N_DIR}',
      EXECUTIONS_DATA_SAVE_ON_ERROR: 'all',
      EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all',
      EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: true
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '${N8N_DIR}/logs/error.log',
    out_file: '${N8N_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

su - $N8N_USER -c "cd $N8N_DIR && pm2 start ecosystem.config.js && pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u $N8N_USER --hp /home/$N8N_USER

# --------------------------
# Nginx yapılandırması
# --------------------------
# API
cat > /etc/nginx/sites-available/$API_DOMAIN << EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

# Admin
if [ "$SKIP_ADMIN" != true ]; then
cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << EOF
server {
    listen 80;
    server_name $ADMIN_DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
fi

# N8N
cat > /etc/nginx/sites-available/n8n << EOF
server {
    listen 80;
    server_name $N8N_DOMAIN;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:$N8N_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/

# Nginx reload
nginx -t && systemctl reload nginx

# --------------------------
# Certbot SSL
# --------------------------
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
if [ "$SKIP_ADMIN" != true ]; then
    certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi
certbot --nginx -d $N8N_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
(crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# --------------------------
# Firewall
# --------------------------
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --------------------------
# Tamamlama
# --------------------------
echo -e "${GREEN}✅ Huglu + N8N Deployment tamamlandı!${NC}"
echo -e "API: http://$API_DOMAIN"
if [ "$SKIP_ADMIN" != true ]; then
    echo -e "Admin: http://$ADMIN_DOMAIN"
fi
echo -e "N8N: https://$N8N_DOMAIN"
echo -e "PM2 durumunu görmek için: pm2 status"