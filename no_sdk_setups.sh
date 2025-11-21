#!/bin/bash

# ========================================
# Huglu + N8N + AI Service + CasaOS Full Stack Deployment Script
# SDK Tools Disabled - Only Project Dependencies
# Debian 11 Bullseye Optimized
# Interactive Menu System
# Domains:
#   Main Site: huglutekstil.com
#   API: api.huglutekstil.com
#   Admin: admin.huglutekstil.com
#   N8N: otomasyon.huglutekstil.com
#   CasaOS: casaos.huglutekstil.com
# Services:
#   AI/ML Service: localhost:8001 (internal only)
#   CasaOS: localhost:80 (default)
# ========================================

set -e

# --------------------------
# Colors
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# --------------------------
# Variables
# --------------------------
# Main Site
MAIN_DOMAIN="huglutekstil.com"
MAIN_DIR="/root/final_versiyonn/web"
MAIN_PORT=3006
MAIN_PM2_NAME="huglu-web"

# API
API_DOMAIN="api.huglutekstil.com"
API_DIR="/root/final_versiyonn/server"
API_PORT=3000
API_PM2_NAME="huglu-api"

# Admin Panel
ADMIN_DOMAIN="admin.huglutekstil.com"
ADMIN_DIR="/root/final_versiyonn/admin-panel"
ADMIN_PORT=3001
ADMIN_PM2_NAME="admin-panel"

# AI/ML Service
AI_DIR="/root/final_versiyonn/ml-service"
AI_PORT=8001
AI_PM2_NAME="ml-service"

# N8N
N8N_DOMAIN="otomasyon.huglutekstil.com"
N8N_PORT=5678
N8N_USER=$(whoami)
N8N_DIR="/home/$N8N_USER/n8n"

# CasaOS
CASAOS_DOMAIN="casaos.huglutekstil.com"
CASAOS_PORT=3564
CASAOS_INTERNAL_PORT=80

# Redis
REDIS_PORT=6379
REDIS_MAXMEMORY="256mb"
REDIS_MAXMEMORY_POLICY="allkeys-lru"

EMAIL="berat@beratsimsek.com.tr"

ERRORS=0
WARNINGS=0
SKIP_ADMIN=false
SKIP_MAIN=false
SKIP_N8N=false
SKIP_AI=false
SKIP_CASAOS=false

# --------------------------
# Root Check
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run as root!${NC}"
    exit 1
fi

# --------------------------
# Helper Functions
# --------------------------
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_menu() {
    clear
    print_header "Huglu Tekstil Dağıtım Yöneticisi"
    echo -e "${GREEN}Debian 11 Bullseye Optimize Edilmiş${NC}"
    echo ""
    echo -e "${YELLOW}Ana Menü:${NC}"
    echo -e "  ${CYAN}1)${NC} Tam Kurulum (Tüm Servisler)"
    echo -e "  ${CYAN}2)${NC} Sadece Temel Servisleri Kur (Web, API, Admin, AI)"
    echo -e "  ${CYAN}3)${NC} N8N Yönetimi"
    echo -e "  ${CYAN}4)${NC} CasaOS Yönetimi"
    echo -e "  ${CYAN}5)${NC} Tüm Servisleri Yeniden Başlat"
    echo -e "  ${CYAN}6)${NC} Sistem Durumunu Görüntüle"
    echo -e "  ${CYAN}7)${NC} Çıkış"
    echo ""
}

print_n8n_menu() {
    clear
    print_header "N8N Yönetimi"
    echo -e "${YELLOW}Seçenekler:${NC}"
    echo -e "  ${CYAN}1)${NC} N8N Kur (Yeni Kurulum)"
    echo -e "  ${CYAN}2)${NC} N8N'i Yeniden Kur (Sil ve Kur)"
    echo -e "  ${CYAN}3)${NC} N8N'i Tamamen Kaldır"
    echo -e "  ${CYAN}4)${NC} N8N Durumunu Kontrol Et"
    echo -e "  ${CYAN}5)${NC} Ana Menüye Dön"
    echo ""
}

print_casaos_menu() {
    clear
    print_header "CasaOS Yönetimi"
    echo -e "${YELLOW}Seçenekler:${NC}"
    echo -e "  ${CYAN}1)${NC} CasaOS Kur (Yeni Kurulum)"
    echo -e "  ${CYAN}2)${NC} CasaOS'u Yeniden Kur (Sil ve Kur)"
    echo -e "  ${CYAN}3)${NC} CasaOS'u Tamamen Kaldır"
    echo -e "  ${CYAN}4)${NC} CasaOS Durumunu Kontrol Et"
    echo -e "  ${CYAN}5)${NC} Ana Menüye Dön"
    echo ""
}

pause_screen() {
    echo ""
    read -p "Devam etmek için Enter'a basın..."
}

# --------------------------
# Restart All Services Function
# --------------------------
restart_all_services() {
    clear
    print_header "Tüm Servisleri Yeniden Başlatma"
    
    echo -e "${YELLOW}Hangi servisleri yeniden başlatmak istiyorsunuz?${NC}"
    echo ""
    echo -e "  ${CYAN}1)${NC} Sadece PM2 Servisleri (Web, API, Admin, AI, N8N)"
    echo -e "  ${CYAN}2)${NC} Sadece Sistem Servisleri (Nginx, Redis, CasaOS)"
    echo -e "  ${CYAN}3)${NC} TÜM SERVİSLER (PM2 + Sistem)"
    echo -e "  ${CYAN}4)${NC} İptal"
    echo ""
    read -p "Seçiminiz [1-4]: " restart_choice
    
    case $restart_choice in
        1)
            echo -e "${BLUE}PM2 servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart PM2 services
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            if pm2 describe $AI_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $AI_PM2_NAME${NC}"
                pm2 restart $AI_PM2_NAME
            fi
            
            if pm2 describe n8n &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: N8N${NC}"
                pm2 restart n8n
            fi
            
            echo ""
            echo -e "${GREEN}✅ PM2 servisleri yeniden başlatıldı!${NC}"
            echo ""
            pm2 list
            ;;
            
        2)
            echo -e "${BLUE}Sistem servisleri yeniden başlatılıyor...${NC}"
            echo ""
            
            # Restart Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN}✅ Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Restart Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN}✅ Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
            # Restart CasaOS if exists
            if command -v casaos &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: CasaOS${NC}"
                systemctl restart casaos
                if systemctl is-active --quiet casaos; then
                    echo -e "${GREEN}✅ CasaOS başarıyla yeniden başlatıldı${NC}"
                else
                    echo -e "${RED}❌ CasaOS yeniden başlatılamadı!${NC}"
                fi
            fi
            
            echo ""
            echo -e "${GREEN}✅ Sistem servisleri yeniden başlatıldı!${NC}"
            ;;
            
        3)
            echo -e "${BLUE}TÜM SERVİSLER yeniden başlatılıyor...${NC}"
            echo ""
            
            # PM2 Services
            echo -e "${MAGENTA}=== PM2 Servisleri ===${NC}"
            if pm2 describe $MAIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $MAIN_PM2_NAME${NC}"
                pm2 restart $MAIN_PM2_NAME
            fi
            
            if pm2 describe $API_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $API_PM2_NAME${NC}"
                pm2 restart $API_PM2_NAME
            fi
            
            if pm2 describe $ADMIN_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $ADMIN_PM2_NAME${NC}"
                pm2 restart $ADMIN_PM2_NAME
            fi
            
            if pm2 describe $AI_PM2_NAME &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: $AI_PM2_NAME${NC}"
                pm2 restart $AI_PM2_NAME
            fi
            
            if pm2 describe n8n &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: N8N${NC}"
                pm2 restart n8n
            fi
            
            echo ""
            echo -e "${MAGENTA}=== Sistem Servisleri ===${NC}"
            
            # Nginx
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN}✅ Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            # Redis
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN}✅ Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
            # CasaOS
            if command -v casaos &>/dev/null; then
                echo -e "${YELLOW}Yeniden başlatılıyor: CasaOS${NC}"
                systemctl restart casaos
                if systemctl is-active --quiet casaos; then
                    echo -e "${GREEN}✅ CasaOS başarıyla yeniden başlatıldı${NC}"
                else
                    echo -e "${RED}❌ CasaOS yeniden başlatılamadı!${NC}"
                fi
            fi
            
            echo ""
            echo -e "${GREEN}✅ TÜM SERVİSLER başarıyla yeniden başlatıldı!${NC}"
            echo ""
            echo -e "${BLUE}PM2 Durumu:${NC}"
            pm2 list
            ;;
            
        4)
            echo -e "${YELLOW}İptal edildi.${NC}"
            return
            ;;
            
        *)
            echo -e "${RED}Geçersiz seçenek!${NC}"
            ;;
    esac
}

# --------------------------
# N8N Functions
# --------------------------
check_n8n_status() {
    echo -e "${BLUE}N8N Durumu Kontrol Ediliyor...${NC}"
    echo ""
    
    if command -v n8n &>/dev/null; then
        echo -e "${GREEN}✅ N8N Binary: Kurulu${NC}"
        N8N_VERSION=$(n8n --version 2>/dev/null || echo "bilinmiyor")
        echo -e "   Versiyon: $N8N_VERSION"
    else
        echo -e "${RED}❌ N8N Binary: Kurulu Değil${NC}"
    fi
    
    if pm2 describe n8n &>/dev/null; then
        if pm2 list | grep -q "n8n.*online"; then
            echo -e "${GREEN}✅ N8N Servisi: Çalışıyor${NC}"
        else
            echo -e "${YELLOW}⚠️  N8N Servisi: Durdurulmuş${NC}"
        fi
    else
        echo -e "${RED}❌ N8N Servisi: Bulunamadı${NC}"
    fi
    
    if [ -f "$N8N_DIR/.n8n/database.sqlite" ]; then
        DB_SIZE=$(du -h "$N8N_DIR/.n8n/database.sqlite" | cut -f1)
        echo -e "${GREEN}✅ N8N Veritabanı: Mevcut ($DB_SIZE)${NC}"
    else
        echo -e "${RED}❌ N8N Veritabanı: Bulunamadı${NC}"
    fi
    
    if [ -f "/etc/nginx/sites-available/n8n" ]; then
        echo -e "${GREEN}✅ N8N Nginx Yapılandırması: Mevcut${NC}"
    else
        echo -e "${RED}❌ N8N Nginx Yapılandırması: Bulunamadı${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}N8N URL: https://$N8N_DOMAIN${NC}"
}

remove_n8n() {
    echo -e "${YELLOW}N8N Kaldırılıyor...${NC}"
    
    # Stop PM2 process
    pm2 delete n8n 2>/dev/null || true
    pm2 save
    
    # Remove N8N binary
    npm uninstall -g n8n 2>/dev/null || true
    
    # Remove Nginx config
    rm -f /etc/nginx/sites-enabled/n8n
    rm -f /etc/nginx/sites-available/n8n
    nginx -t && systemctl reload nginx
    
    # Remove SSL certificate
    certbot delete --cert-name $N8N_DOMAIN --non-interactive 2>/dev/null || true
    
    # Ask about data removal
    echo ""
    read -p "N8N veri dizinini silmek istiyor musunuz ($N8N_DIR)? [e/H]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ee]$ ]]; then
        rm -rf $N8N_DIR
        echo -e "${GREEN}✅ N8N verileri silindi${NC}"
    else
        echo -e "${YELLOW}⚠️  N8N verileri korundu: $N8N_DIR${NC}"
    fi
    
    echo -e "${GREEN}✅ N8N başarıyla kaldırıldı${NC}"
}

install_n8n() {
    echo -e "${BLUE}N8N Kuruluyor...${NC}"
    
    # Install N8N binary
    echo -e "${YELLOW}N8N binary kuruluyor...${NC}"
    npm install -g n8n --ignore-scripts
    
    # Create N8N directories
    mkdir -p $N8N_DIR/logs
    chown -R $N8N_USER:$N8N_USER $N8N_DIR

    # Create N8N ecosystem config file
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
      EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS: true,
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT},
      QUEUE_BULL_REDIS_HOST: '127.0.0.1',
      QUEUE_BULL_REDIS_PORT: ${REDIS_PORT}
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

    # Create Nginx config
    cat > /etc/nginx/sites-available/n8n << 'NGINXEOF'
server {
    listen 80;
    server_name otomasyon.huglutekstil.com;
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

    ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx

    # Start N8N
    su - $N8N_USER -c "cd $N8N_DIR && pm2 start ecosystem.config.js && pm2 save"
    
    # Setup SSL
    echo -e "${YELLOW}SSL sertifikası kuruluyor...${NC}"
    certbot --nginx -d $N8N_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
    
    echo -e "${GREEN}✅ N8N başarıyla kuruldu${NC}"
    echo -e "${CYAN}N8N Erişim: https://$N8N_DOMAIN${NC}"
}

reinstall_n8n() {
    echo -e "${YELLOW}N8N Yeniden Kuruluyor...${NC}"
    remove_n8n
    echo ""
    install_n8n
}

# --------------------------
# CasaOS Functions
# --------------------------
check_casaos_status() {
    echo -e "${BLUE}CasaOS Durumu Kontrol Ediliyor...${NC}"
    echo ""
    
    if command -v casaos &>/dev/null; then
        echo -e "${GREEN}✅ CasaOS Binary: Kurulu${NC}"
        CASAOS_VERSION=$(casaos -v 2>/dev/null || echo "bilinmiyor")
        echo -e "   Versiyon: $CASAOS_VERSION"
    else
        echo -e "${RED}❌ CasaOS Binary: Kurulu Değil${NC}"
    fi
    
    if systemctl is-active --quiet casaos; then
        echo -e "${GREEN}✅ CasaOS Servisi: Çalışıyor${NC}"
    else
        echo -e "${RED}❌ CasaOS Servisi: Durdurulmuş${NC}"
    fi
    
    if [ -d "/var/lib/casaos" ]; then
        echo -e "${GREEN}✅ CasaOS Veri Dizini: Mevcut${NC}"
    else
        echo -e "${RED}❌ CasaOS Veri Dizini: Bulunamadı${NC}"
    fi
    
    if [ -f "/etc/nginx/sites-available/casaos" ]; then
        echo -e "${GREEN}✅ CasaOS Nginx Yapılandırması: Mevcut${NC}"
    else
        echo -e "${RED}❌ CasaOS Nginx Yapılandırması: Bulunamadı${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}CasaOS Domain URL: https://$CASAOS_DOMAIN${NC}"
    echo -e "${CYAN}CasaOS Dahili Port: ${CASAOS_INTERNAL_PORT}${NC}"
    echo -e "${CYAN}CasaOS Nginx Port: ${CASAOS_PORT}${NC}"
}

remove_casaos() {
    echo -e "${YELLOW}CasaOS Kaldırılıyor...${NC}"
    
    # Stop CasaOS service
    systemctl stop casaos 2>/dev/null || true
    systemctl disable casaos 2>/dev/null || true
    
    # Remove Nginx config
    rm -f /etc/nginx/sites-enabled/casaos
    rm -f /etc/nginx/sites-available/casaos
    nginx -t && systemctl reload nginx
    
    # Remove SSL certificate
    certbot delete --cert-name $CASAOS_DOMAIN --non-interactive 2>/dev/null || true
    
    # Ask about complete removal
    echo ""
    read -p "CasaOS'u TAMAMEN kaldırmak istiyor musunuz (tüm veriler dahil)? [e/H]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ee]$ ]]; then
        # Run CasaOS uninstall script if exists
        if [ -f "/usr/bin/casaos-uninstall" ]; then
            /usr/bin/casaos-uninstall || true
        fi
        
        # Manual cleanup
        rm -rf /var/lib/casaos
        rm -rf /etc/casaos
        rm -rf /usr/share/casaos
        rm -f /usr/bin/casaos*
        rm -f /etc/systemd/system/casaos*
        
        systemctl daemon-reload
        
        echo -e "${GREEN}✅ CasaOS tamamen kaldırıldı${NC}"
    else
        echo -e "${YELLOW}⚠️  CasaOS servisi durduruldu ancak veriler korundu${NC}"
    fi
}

install_casaos() {
    echo -e "${BLUE}CasaOS Kuruluyor...${NC}"
    
    # Download and run CasaOS installation script
    curl -fsSL https://get.casaos.io | bash
    
    # Wait for CasaOS to start
    sleep 5
    
    # Check if CasaOS is running
    if systemctl is-active --quiet casaos; then
        echo -e "${GREEN}✅ CasaOS başarıyla kuruldu ve başlatıldı${NC}"
        
        # Change CasaOS default port to avoid conflicts
        echo -e "${YELLOW}CasaOS portu ${CASAOS_PORT} olarak yapılandırılıyor...${NC}"
        
        # Stop CasaOS temporarily
        systemctl stop casaos
        
        # Update CasaOS configuration
        if [ -f "/etc/casaos/gateway.ini" ]; then
            # Backup original config
            cp /etc/casaos/gateway.ini /etc/casaos/gateway.ini.backup
            
            # Change port in configuration
            sed -i "s/Port = 80/Port = ${CASAOS_PORT}/g" /etc/casaos/gateway.ini
            sed -i "s/port = 80/port = ${CASAOS_PORT}/g" /etc/casaos/gateway.ini
        fi
        
        # Restart CasaOS with new configuration
        systemctl start casaos
        sleep 3
        
        echo -e "${GREEN}✅ CasaOS portu ${CASAOS_PORT} olarak değiştirildi${NC}"
        
        # Create Nginx config
        cat > /etc/nginx/sites-available/casaos << NGINXEOF
server {
    listen 80;
    server_name ${CASAOS_DOMAIN};
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:${CASAOS_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINXEOF

        ln -sf /etc/nginx/sites-available/casaos /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
        
        # Setup SSL
        echo -e "${YELLOW}SSL sertifikası kuruluyor...${NC}"
        certbot --nginx -d $CASAOS_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
        
        echo -e "${GREEN}✅ CasaOS Nginx yapılandırması tamamlandı${NC}"
        echo -e "${CYAN}CasaOS Erişim: https://$CASAOS_DOMAIN${NC}"
        echo -e "${CYAN}Lokal Erişim: http://localhost:${CASAOS_PORT}${NC}"
        echo -e "${YELLOW}Not: CasaOS varsayılan portu çakışmayı önlemek için ${CASAOS_PORT} olarak değiştirildi${NC}"
    else
        echo -e "${RED}❌ CasaOS başlatılamadı! Logları kontrol edin: journalctl -u casaos${NC}"
    fi
}

reinstall_casaos() {
    echo -e "${YELLOW}CasaOS Yeniden Kuruluyor...${NC}"
    remove_casaos
    echo ""
    install_casaos
}

# --------------------------
# System Status Function
# --------------------------
show_system_status() {
    clear
    print_header "Sistem Durumu"
    
    echo -e "${BLUE}PM2 Servisleri:${NC}"
    pm2 list
    echo ""
    
    echo -e "${BLUE}Nginx Durumu:${NC}"
    systemctl status nginx --no-pager | head -n 10
    echo ""
    
    echo -e "${BLUE}Redis Durumu:${NC}"
    systemctl status redis-server --no-pager | head -n 10
    echo ""
    
    if command -v casaos &>/dev/null; then
        echo -e "${BLUE}CasaOS Durumu:${NC}"
        systemctl status casaos --no-pager | head -n 10
        echo ""
    fi
    
    echo -e "${GREEN}Yapılandırılmış Domain'ler:${NC}"
    echo -e "  Ana Site: https://$MAIN_DOMAIN"
    echo -e "  API: https://$API_DOMAIN"
    echo -e "  Admin: https://$ADMIN_DOMAIN"
    echo -e "  N8N: https://$N8N_DOMAIN"
    echo -e "  CasaOS: https://$CASAOS_DOMAIN"
    echo ""
    
    echo -e "${GREEN}Dahili Servisler:${NC}"
    echo -e "  AI/ML Servisi: http://localhost:${AI_PORT}"
    echo -e "  Redis: localhost:${REDIS_PORT}"
    echo -e "  CasaOS: localhost:${CASAOS_PORT}"
}

# --------------------------
# Core Installation Functions
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[DÜZELTME] Mevcut PM2 ve Nginx yapılandırmaları temizleniyor...${NC}"
    pm2 delete $MAIN_PM2_NAME 2>/dev/null || true
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    pm2 delete $AI_PM2_NAME 2>/dev/null || true

    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/default
}

install_system_packages() {
    echo -e "${BLUE}[1/7] Sistem güncelleniyor...${NC}"
    apt update -y && apt upgrade -y

    # Required packages for Debian 11
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
        python3-dev \
        python3-venv \
        python3-certbot-nginx \
        ca-certificates \
        gnupg \
        lsb-release \
        apt-transport-https \
        software-properties-common \
        unzip \
        zip \
        redis-server
}

install_redis() {
    echo -e "${BLUE}[2/7] Installing and configuring Redis...${NC}"

    # Stop Redis
    systemctl stop redis-server 2>/dev/null || true

    # Backup Redis config
    if [ -f /etc/redis/redis.conf ]; then
        cp /etc/redis/redis.conf /etc/redis/redis.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Create new Redis configuration (No Password)
    cat > /etc/redis/redis.conf << 'REDISCONF'
# Redis Configuration - No Username/Password (Localhost Only)

# Network - Only localhost access
bind 127.0.0.1 ::1
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Append Only File
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
REDISCONF

    # Set Redis directory permissions
    mkdir -p /var/lib/redis
    mkdir -p /var/log/redis
    mkdir -p /var/run/redis
    chown -R redis:redis /var/lib/redis
    chown -R redis:redis /var/log/redis
    chown -R redis:redis /var/run/redis
    chmod 750 /var/lib/redis
    chmod 750 /var/log/redis

    # Configure Redis service
    systemctl enable redis-server
    systemctl start redis-server

    # Check Redis status
    sleep 2
    if systemctl is-active --quiet redis-server; then
        echo -e "${GREEN}✅ Redis successfully installed and started${NC}"
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis connection test successful (PONG)${NC}"
        fi
    else
        echo -e "${RED}❌ Redis failed to start!${NC}"
    fi
}

install_nodejs() {
    echo -e "${BLUE}[3/7] Installing Node.js and PM2...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    fi

    npm install -g pm2 npm@latest

    node --version
    npm --version
}

clone_repository() {
    echo -e "${BLUE}[4/7] Cloning repository...${NC}"
    if [ ! -d "/root/final_versiyonn" ]; then
        git clone https://github.com/berat-eth/final_versiyonn.git /root/final_versiyonn
    else
        cd /root/final_versiyonn
        git pull origin main || git pull origin master || true
    fi
}

install_main_site() {
    echo -e "${BLUE}[5/7] Setting up main site (Next.js)...${NC}"
    if [ -d "$MAIN_DIR" ]; then
        cd $MAIN_DIR
        
        npm install
        npm run build
        
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
      PORT: ${MAIN_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT}
    }
  }]
};
EOF
        
        mkdir -p logs
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "${GREEN}✅ Next.js main site successfully installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Web directory not found, skipping...${NC}"
        SKIP_MAIN=true
    fi
}

install_api() {
    echo -e "${BLUE}[6/7] Setting up API...${NC}"
    if [ -d "$API_DIR" ]; then
        cd $API_DIR
        
        if [ -f ".env" ]; then
            if ! grep -q "REDIS_HOST" .env; then
                echo "" >> .env
                echo "REDIS_HOST=127.0.0.1" >> .env
                echo "REDIS_PORT=${REDIS_PORT}" >> .env
            fi
            if ! grep -q "AI_SERVICE_URL" .env; then
                echo "AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}" >> .env
            fi
        else
            cat > .env << ENVEOF
REDIS_HOST=127.0.0.1
REDIS_PORT=${REDIS_PORT}
AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}
ENVEOF
        fi
        
        npm install --production
        pm2 start server.js --name $API_PM2_NAME --time
        pm2 save
        echo -e "${GREEN}✅ API successfully installed${NC}"
    fi
}

install_admin() {
    if [ -d "$ADMIN_DIR" ]; then
        echo -e "${BLUE}Setting up Admin Panel...${NC}"
        cd $ADMIN_DIR
        npm install
        npm run build
        PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
        pm2 save
        echo -e "${GREEN}✅ Admin panel successfully installed${NC}"
    else
        SKIP_ADMIN=true
    fi
}

install_ai_service() {
    echo -e "${BLUE}[7/7] Setting up AI/ML Service...${NC}"
    if [ -d "$AI_DIR" ]; then
        cd $AI_DIR
        
        python3 -m pip install --upgrade pip
        
        if [ -f "requirements.txt" ]; then
            pip3 install -r requirements.txt
            
            if [ -f "main.py" ]; then
                mkdir -p logs
                
                cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${AI_PM2_NAME}',
    script: 'python3',
    args: 'main.py',
    cwd: '${AI_DIR}',
    interpreter: 'none',
    env: {
      PORT: ${AI_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT},
      PYTHONUNBUFFERED: '1'
    }
  }]
};
EOF
                
                pm2 start ecosystem.config.js
                pm2 save
                
                echo -e "${GREEN}✅ AI/ML Service successfully installed${NC}"
            fi
        fi
    else
        SKIP_AI=true
    fi
}

configure_nginx() {
    echo -e "${BLUE}Configuring Nginx...${NC}"

    # Main Site
    if [ "$SKIP_MAIN" != true ]; then
    cat > /etc/nginx/sites-available/$MAIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name huglutekstil.com www.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$MAIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    # API
    cat > /etc/nginx/sites-available/$API_DOMAIN << 'EOF'
server {
    listen 80;
    server_name api.huglutekstil.com;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

    # Admin
    if [ "$SKIP_ADMIN" != true ]; then
    cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name admin.huglutekstil.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
    fi

    nginx -t && systemctl reload nginx
}

install_ssl() {
    echo -e "${BLUE}Installing SSL certificates...${NC}"

    if [ "$SKIP_MAIN" != true ]; then
        certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
    fi

    certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true

    if [ "$SKIP_ADMIN" != true ]; then
        certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
    fi

    # Auto renewal
    (crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
}

configure_firewall() {
    echo -e "${BLUE}Configuring firewall...${NC}"
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
}

setup_pm2_startup() {
    pm2 startup systemd
    pm2 save
}

# --------------------------
# Full Installation Function
# --------------------------
full_installation() {
    print_header "Starting Full Installation"
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    install_ai_service
    configure_nginx
    install_ssl
    
    # Install N8N
    echo ""
    read -p "Do you want to install N8N? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        install_n8n
    fi
    
    # Install CasaOS
    echo ""
    read -p "Do you want to install CasaOS? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        install_casaos
    fi
    
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Installation Completed!"
    echo -e "${GREEN}All services have been installed successfully!${NC}"
    echo ""
    show_system_status
}

# --------------------------
# Core Services Only Installation
# --------------------------
core_installation() {
    print_header "Installing Core Services Only"
    
    cleanup_and_fix
    install_system_packages
    install_redis
    install_nodejs
    clone_repository
    install_main_site
    install_api
    install_admin
    install_ai_service
    configure_nginx
    install_ssl
    configure_firewall
    setup_pm2_startup
    
    echo ""
    print_header "Core Installation Completed!"
    echo -e "${GREEN}Core services have been installed successfully!${NC}"
    echo -e "${YELLOW}N8N and CasaOS were not installed.${NC}"
    echo ""
    show_system_status
}

# --------------------------
# N8N Menu Handler
# --------------------------
n8n_menu_handler() {
    while true; do
        print_n8n_menu
        read -p "Select an option [1-5]: " n8n_choice
        
        case $n8n_choice in
            1)
                if command -v n8n &>/dev/null || pm2 describe n8n &>/dev/null; then
                    echo -e "${YELLOW}N8N is already installed!${NC}"
                    pause_screen
                else
                    install_n8n
                    pause_screen
                fi
                ;;
            2)
                reinstall_n8n
                pause_screen
                ;;
            3)
                remove_n8n
                pause_screen
                ;;
            4)
                check_n8n_status
                pause_screen
                ;;
            5)
                break
                ;;
            *)
                echo -e "${RED}Invalid option!${NC}"
                pause_screen
                ;;
        esac
    done
}

# --------------------------
# CasaOS Menu Handler
# --------------------------
casaos_menu_handler() {
    while true; do
        print_casaos_menu
        read -p "Select an option [1-5]: " casaos_choice
        
        case $casaos_choice in
            1)
                if command -v casaos &>/dev/null; then
                    echo -e "${YELLOW}CasaOS is already installed!${NC}"
                    pause_screen
                else
                    install_casaos
                    pause_screen
                fi
                ;;
            2)
                reinstall_casaos
                pause_screen
                ;;
            3)
                remove_casaos
                pause_screen
                ;;
            4)
                check_casaos_status
                pause_screen
                ;;
            5)
                break
                ;;
            *)
                echo -e "${RED}Invalid option!${NC}"
                pause_screen
                ;;
        esac
    done
}

# --------------------------
# Main Menu Loop
# --------------------------
main_menu() {
    while true; do
        print_menu
        read -p "Select an option [1-6]: " choice
        
        case $choice in
            1)
                full_installation
                pause_screen
                ;;
            2)
                core_installation
                pause_screen
                ;;
            3)
                n8n_menu_handler
                ;;
            4)
                casaos_menu_handler
                ;;
            5)
                show_system_status
                pause_screen
                ;;
            6)
                echo -e "${GREEN}Exiting...${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option! Please select 1-6${NC}"
                pause_screen
                ;;
        esac
    done
}

# --------------------------
# Start Script
# --------------------------
print_header "Huglu Tekstil Deployment Manager"
echo -e "${CYAN}Debian 11 Bullseye Optimized${NC}"
echo -e "${YELLOW}Initializing...${NC}"
sleep 1

# Start main menu
main_menu