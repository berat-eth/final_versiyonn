#!/bin/bash

# ========================================
# Huglu + N8N Full Stack Deployment + APK Build Script
# Debian 11 Bullseye Optimized
# Domains:
#   Main Site: plaxsy.com
#   API: api.plaxsy.com
#   Admin: admin.plaxsy.com
#   N8N: otomasyon.plaxsy.com
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
# Ana Site
MAIN_DOMAIN="plaxsy.com"
MAIN_DIR="/root/final_versiyonn/web"
MAIN_PORT=3006
MAIN_PM2_NAME="plaxsy-web"

# API
API_DOMAIN="api.plaxsy.com"
API_DIR="/root/final_versiyonn/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

# Admin Panel
ADMIN_DOMAIN="admin.plaxsy.com"
ADMIN_DIR="/root/final_versiyonn/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

# N8N
N8N_DOMAIN="otomasyon.plaxsy.com"
N8N_PORT=5678
N8N_USER=$(whoami)
N8N_DIR="/home/$N8N_USER/n8n"

EMAIL="berat@beratsimsek.com.tr"

# APK Build Değişkenleri
ANDROID_DIR="/root/final_versiyonn/android"
APK_OUTPUT_DIR="/root/apk-builds"
JAVA_VERSION="17"
ANDROID_SDK_ROOT="/opt/android-sdk"
ANDROID_HOME="/opt/android-sdk"

ERRORS=0
WARNINGS=0
SKIP_ADMIN=false
SKIP_MAIN=false

# --------------------------
# Root kontrolü
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Bu script root olarak çalıştırılmalıdır!${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Debian 11 Bullseye için hazırlanmıştır${NC}"
echo -e "${BLUE}========================================${NC}"

# --------------------------
# Temizlik fonksiyonu
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[FIX] Mevcut PM2 ve Nginx konfigürasyonları temizleniyor...${NC}"
    pm2 delete $MAIN_PM2_NAME 2>/dev/null || true
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    pm2 delete n8n 2>/dev/null || true

    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/n8n
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/n8n
    rm -f /etc/nginx/sites-enabled/default
}

cleanup_and_fix

# --------------------------
# Sistem güncelleme ve paketler
# --------------------------
echo -e "${BLUE}[1/9] Sistem güncelleniyor...${NC}"
apt update -y && apt upgrade -y

# Debian 11 için gerekli paketler
apt install -y \
    net-tools \
    lsof \
    curl \
    wget \
    git \
    nginx \
    ufw \
    build-essential \
    python3 \
    python3-pip \
    python3-certbot-nginx \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common \
    unzip \
    zip

# --------------------------
# Java 17 Kurulumu (APK build için)
# --------------------------
echo -e "${BLUE}[2/9] Java 17 kuruluyor (APK build için)...${NC}"
if ! java -version 2>&1 | grep -q "version \"17"; then
    wget -O- https://apt.corretto.aws/corretto.key | apt-key add -
    add-apt-repository 'deb https://apt.corretto.aws stable main'
    apt update -y
    apt install -y java-17-amazon-corretto-jdk
fi

export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto
export PATH=$JAVA_HOME/bin:$PATH
echo "export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto" >> /root/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> /root/.bashrc

java -version

# --------------------------
# Android SDK ve Build Tools Kurulumu
# --------------------------
echo -e "${BLUE}[3/9] Android SDK ve build tools kuruluyor...${NC}"
mkdir -p $ANDROID_SDK_ROOT
cd /tmp

if [ ! -f "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" ]; then
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
    unzip -q commandlinetools-linux-9477386_latest.zip -d $ANDROID_SDK_ROOT
    mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest
    mv $ANDROID_SDK_ROOT/cmdline-tools/{bin,lib,NOTICE.txt,source.properties} $ANDROID_SDK_ROOT/cmdline-tools/latest/ 2>/dev/null || true
    rm -f commandlinetools-linux-9477386_latest.zip
fi

export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export ANDROID_HOME=$ANDROID_HOME
export PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> /root/.bashrc
echo "export ANDROID_HOME=$ANDROID_HOME" >> /root/.bashrc
echo "export PATH=\$PATH:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:\$ANDROID_SDK_ROOT/platform-tools" >> /root/.bashrc

# SDK paketlerini yükle
yes | sdkmanager --licenses || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;25.2.9519653"

# --------------------------
# Gradle Kurulumu
# --------------------------
echo -e "${BLUE}[4/9] Gradle kuruluyor...${NC}"
if ! command -v gradle &> /dev/null; then
    GRADLE_VERSION="8.5"
    wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -P /tmp
    unzip -q /tmp/gradle-${GRADLE_VERSION}-bin.zip -d /opt
    ln -sf /opt/gradle-${GRADLE_VERSION}/bin/gradle /usr/bin/gradle
    rm /tmp/gradle-${GRADLE_VERSION}-bin.zip
fi

gradle --version

# --------------------------
# Node.js ve PM2
# --------------------------
echo -e "${BLUE}[5/9] Node.js ve PM2 kuruluyor...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

npm install -g pm2 npm@latest

node --version
npm --version

# --------------------------
# Repo klonlama ve dizin kontrol
# --------------------------
echo -e "${BLUE}[6/9] Repository klonlanıyor...${NC}"
if [ ! -d "/root/final_versiyonn" ]; then
    git clone https://github.com/berat-eth/final_versiyonn.git /root/final_versiyonn
else
    cd /root/final_versiyonn
    git pull origin main || git pull origin master || true
fi

# --------------------------
# Ana Site Kurulumu (plaxsy.com - Next.js)
# --------------------------
echo -e "${BLUE}[7/9] Ana site kuruluyor (Next.js - plaxsy.com)...${NC}"
if [ -d "$MAIN_DIR" ]; then
    cd $MAIN_DIR
    
    echo -e "${YELLOW}Next.js dependencies yükleniyor...${NC}"
    npm install
    
    # Next.js build
    echo -e "${YELLOW}Next.js production build yapılıyor...${NC}"
    npm run build
    
    # PM2 ecosystem dosyası oluştur
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${MAIN_PM2_NAME}',
    script: 'npm',
    args: 'start',
    cwd: '${MAIN_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: ${MAIN_PORT}
    },
    error_file: '${MAIN_DIR}/logs/error.log',
    out_file: '${MAIN_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF
    
    # Log dizinini oluştur
    mkdir -p logs
    
    # PM2 ile başlat
    pm2 start ecosystem.config.js
    pm2 save
    
    echo -e "${GREEN}✅ Next.js ana site başarıyla kuruldu${NC}"
else
    echo -e "${YELLOW}⚠️  Web dizini bulunamadı: $MAIN_DIR${NC}"
    echo -e "${YELLOW}Next.js projesi atlanıyor...${NC}"
    SKIP_MAIN=true
fi

# --------------------------
# API Kurulumu
# --------------------------
echo -e "${BLUE}[7/9] API kuruluyor...${NC}"
if [ -d "$API_DIR" ]; then
    cd $API_DIR
    npm install --production
    pm2 start server.js --name $API_PM2_NAME --time --log-date-format="YYYY-MM-DD HH:mm:ss" --max-memory-restart 500M
    pm2 save
    echo -e "${GREEN}✅ API başarıyla kuruldu${NC}"
else
    echo -e "${YELLOW}⚠️  API dizini bulunamadı: $API_DIR${NC}"
fi

# --------------------------
# Admin Panel Kurulumu
# --------------------------
if [ -d "$ADMIN_DIR" ]; then
    echo -e "${BLUE}Admin Panel kuruluyor...${NC}"
    cd $ADMIN_DIR
    npm install
    npm run build
    PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
    pm2 save
    echo -e "${GREEN}✅ Admin panel başarıyla kuruldu${NC}"
else
    echo -e "${YELLOW}⚠️  Admin dizini bulunamadı, atlanıyor...${NC}"
    SKIP_ADMIN=true
fi

# --------------------------
# N8N Kurulumu
# --------------------------
echo -e "${BLUE}N8N kuruluyor...${NC}"
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
echo -e "${GREEN}✅ N8N başarıyla kuruldu${NC}"

# --------------------------
# APK Build İşlemi
# --------------------------
echo -e "${BLUE}[8/9] APK Build işlemi başlatılıyor...${NC}"
mkdir -p $APK_OUTPUT_DIR

if [ -d "$ANDROID_DIR" ]; then
    cd $ANDROID_DIR
    
    echo -e "${YELLOW}Dependencies yükleniyor...${NC}"
    if [ -f "package.json" ]; then
        npm install
    fi
    
    # React Native için
    if [ -f "android/gradlew" ]; then
        chmod +x android/gradlew
        cd android
        
        echo -e "${YELLOW}Gradle dependencies indiriliyor...${NC}"
        ./gradlew clean
        
        echo -e "${YELLOW}Release APK build ediliyor...${NC}"
        ./gradlew assembleRelease
        
        # APK'yı kopyala
        if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
            BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
            cp app/build/outputs/apk/release/app-release.apk $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk
            echo -e "${GREEN}✅ APK başarıyla build edildi: $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk${NC}"
        else
            echo -e "${RED}❌ APK build edilemedi!${NC}"
        fi
        
    # Flutter için
    elif [ -f "pubspec.yaml" ]; then
        if ! command -v flutter &> /dev/null; then
            echo -e "${YELLOW}Flutter kuruluyor...${NC}"
            git clone https://github.com/flutter/flutter.git -b stable /opt/flutter
            export PATH="$PATH:/opt/flutter/bin"
            echo "export PATH=\$PATH:/opt/flutter/bin" >> /root/.bashrc
            flutter doctor
        fi
        
        flutter pub get
        flutter build apk --release
        
        if [ -f "build/app/outputs/flutter-apk/app-release.apk" ]; then
            BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
            cp build/app/outputs/flutter-apk/app-release.apk $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk
            echo -e "${GREEN}✅ APK başarıyla build edildi: $APK_OUTPUT_DIR/huglu-${BUILD_DATE}.apk${NC}"
        fi
    else
        echo -e "${RED}❌ Android proje yapısı bulunamadı!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Android dizini bulunamadı: $ANDROID_DIR${NC}"
    echo -e "${YELLOW}APK build atlanıyor...${NC}"
fi

# --------------------------
# Nginx yapılandırması
# --------------------------
echo -e "${BLUE}[9/9] Nginx yapılandırılıyor...${NC}"

# Ana Site (plaxsy.com)
if [ "$SKIP_MAIN" != true ]; then
cat > /etc/nginx/sites-available/$MAIN_DOMAIN << EOF
server {
    listen 80;
    server_name $MAIN_DOMAIN www.$MAIN_DOMAIN;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:$MAIN_PORT;
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
ln -sf /etc/nginx/sites-available/$MAIN_DOMAIN /etc/nginx/sites-enabled/
fi

# API
cat > /etc/nginx/sites-available/$API_DOMAIN << EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
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
ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

# Admin
if [ "$SKIP_ADMIN" != true ]; then
cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << EOF
server {
    listen 80;
    server_name $ADMIN_DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
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

# Nginx test ve reload
nginx -t && systemctl reload nginx

# --------------------------
# Certbot SSL
# --------------------------
echo -e "${BLUE}SSL sertifikaları kuruluyor...${NC}"

# Ana site SSL
if [ "$SKIP_MAIN" != true ]; then
    certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi

# API SSL
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true

# Admin SSL
if [ "$SKIP_ADMIN" != true ]; then
    certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi

# N8N SSL
certbot --nginx -d $N8N_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true

# Otomatik yenileme
(crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# --------------------------
# Firewall
# --------------------------
echo -e "${BLUE}Firewall yapılandırılıyor...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --------------------------
# PM2 startup
# --------------------------
pm2 startup systemd -u root --hp /root
pm2 save

# --------------------------
# Tamamlama Özeti
# --------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Tamamlandı!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Servisler:${NC}"
if [ "$SKIP_MAIN" != true ]; then
    echo -e "  Ana Site: https://$MAIN_DOMAIN (Port: $MAIN_PORT)"
fi
echo -e "  API:      https://$API_DOMAIN (Port: $API_PORT)"
if [ "$SKIP_ADMIN" != true ]; then
    echo -e "  Admin:    https://$ADMIN_DOMAIN (Port: $ADMIN_PORT)"
fi
echo -e "  N8N:      https://$N8N_DOMAIN (Port: $N8N_PORT)"
echo ""
echo -e "${BLUE}📱 APK Build:${NC}"
if [ -d "$APK_OUTPUT_DIR" ] && [ "$(ls -A $APK_OUTPUT_DIR 2>/dev/null)" ]; then
    echo -e "  Output: $APK_OUTPUT_DIR"
    ls -lh $APK_OUTPUT_DIR/*.apk 2>/dev/null || echo "  APK bulunamadı"
else
    echo -e "  ${YELLOW}APK build edilmedi veya dizin bulunamadı${NC}"
fi
echo ""
echo -e "${BLUE}📊 Yönetim Komutları:${NC}"
echo -e "  pm2 status              - Servisleri görüntüle"
echo -e "  pm2 logs                - Logları izle"
echo -e "  pm2 logs $MAIN_PM2_NAME     - Ana site logları"
echo -e "  pm2 logs $API_PM2_NAME      - API logları"
echo -e "  pm2 restart all         - Tüm servisleri yeniden başlat"
echo -e "  pm2 restart $MAIN_PM2_NAME  - Ana siteyi yeniden başlat"
echo -e "  nginx -t                - Nginx config test"
echo -e "  systemctl status nginx  - Nginx durumu"
echo ""
echo -e "${BLUE}🔐 SSL Sertifikaları:${NC}"
echo -e "  certbot certificates    - Sertifikaları listele"
echo -e "  certbot renew --dry-run - Yenileme testi"
echo ""
echo -e "${GREEN}Kurulum başarıyla tamamlandı! 🚀${NC}"