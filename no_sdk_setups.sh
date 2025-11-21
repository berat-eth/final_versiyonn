#!/bin/bash

# ========================================
# Huglu + N8N + AI Service + CasaOS Full Stack Deployment Script
# DÜZELTME: Admin Panel ve Menü Sorunları Giderildi
# Debian 11 Bullseye Optimized
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
    echo -e "  ${CYAN}7)${NC} Nginx Yapılandırmalarını Test Et"
    echo -e "  ${CYAN}8)${NC} ${RED}TÜM YAPILANDIRMALARI SIFIRLA${NC}"
    echo -e "  ${CYAN}9)${NC} Çıkış"
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
# Test Nginx Configurations
# --------------------------
test_nginx_configs() {
    clear
    print_header "Nginx Yapılandırma Testi"
    
    echo -e "${BLUE}Nginx Syntax Testi:${NC}"
    if nginx -t 2>&1; then
        echo -e "${GREEN}✅ Nginx yapılandırması geçerli${NC}"
    else
        echo -e "${RED}❌ Nginx yapılandırmasında hatalar var!${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Aktif Site Yapılandırmaları:${NC}"
    ls -la /etc/nginx/sites-enabled/
    
    echo ""
    echo -e "${BLUE}Port Dinleme Durumu:${NC}"
    netstat -tlnp | grep -E ':(80|443|3000|3001|3006|5678|8001)' || echo "Portlar dinlenmekte değil"
    
    echo ""
    echo -e "${BLUE}Nginx Error Log (Son 20 satır):${NC}"
    tail -n 20 /var/log/nginx/error.log 2>/dev/null || echo "Log dosyası bulunamadı"
}

# --------------------------
# Restart All Services Function - DÜZELTME
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
            
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN}✅ Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN}✅ Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
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
            
            echo -e "${YELLOW}Yeniden başlatılıyor: Nginx${NC}"
            systemctl restart nginx
            if systemctl is-active --quiet nginx; then
                echo -e "${GREEN}✅ Nginx başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Nginx yeniden başlatılamadı!${NC}"
            fi
            
            echo -e "${YELLOW}Yeniden başlatılıyor: Redis${NC}"
            systemctl restart redis-server
            if systemctl is-active --quiet redis-server; then
                echo -e "${GREEN}✅ Redis başarıyla yeniden başlatıldı${NC}"
            else
                echo -e "${RED}❌ Redis yeniden başlatılamadı!${NC}"
            fi
            
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
    
    pm2 delete n8n 2>/dev/null || true
    pm2 save
    
    npm uninstall -g n8n 2>/dev/null || true
    
    rm -f /etc/nginx/sites-enabled/n8n
    rm -f /etc/nginx/sites-available/n8n
    nginx -t && systemctl reload nginx
    
    certbot delete --cert-name $N8N_DOMAIN --non-interactive 2>/dev/null || true
    
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
    
    echo -e "${YELLOW}N8N binary kuruluyor...${NC}"
    npm install -g n8n --ignore-scripts
    
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

    su - $N8N_USER -c "cd $N8N_DIR && pm2 start ecosystem.config.js && pm2 save"
    
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
    
    systemctl stop casaos 2>/dev/null || true
    systemctl disable casaos 2>/dev/null || true
    
    rm -f /etc/nginx/sites-enabled/casaos
    rm -f /etc/nginx/sites-available/casaos
    nginx -t && systemctl reload nginx
    
    certbot delete --cert-name $CASAOS_DOMAIN --non-interactive 2>/dev/null || true
    
    echo ""
    read -p "CasaOS'u TAMAMEN kaldırmak istiyor musunuz (tüm veriler dahil)? [e/H]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ee]$ ]]; then
        if [ -f "/usr/bin/casaos-uninstall" ]; then
            /usr/bin/casaos-uninstall || true
        fi
        
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
    
    curl -fsSL https://get.casaos.io | bash
    
    sleep 5
    
    if systemctl is-active --quiet casaos; then
        echo -e "${GREEN}✅ CasaOS başarıyla kuruldu ve başlatıldı${NC}"
        
        echo -e "${YELLOW}CasaOS portu ${CASAOS_PORT} olarak yapılandırılıyor...${NC}"
        
        systemctl stop casaos
        
        if [ -f "/etc/casaos/gateway.ini" ]; then
            cp /etc/casaos/gateway.ini /etc/casaos/gateway.ini.backup
            
            sed -i "s/Port = 80/Port = ${CASAOS_PORT}/g" /etc/casaos/gateway.ini
            sed -i "s/port = 80/port = ${CASAOS_PORT}/g" /etc/casaos/gateway.ini
        fi
        
        systemctl start casaos
        sleep 3
        
        echo -e "${GREEN}✅ CasaOS portu ${CASAOS_PORT} olarak değiştirildi${NC}"
        
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
        
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINXEOF

        ln -sf /etc/nginx/sites-available/casaos /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
        
        echo -e "${YELLOW}SSL sertifikası kuruluyor...${NC}"
        certbot --nginx -d $CASAOS_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
        
        echo -e "${GREEN}✅ CasaOS Nginx yapılandırması tamamlandı${NC}"
        echo -e "${CYAN}CasaOS Erişim: https://$CASAOS_DOMAIN${NC}"
        echo -e "${CYAN}Lokal Erişim: http://localhost:${CASAOS_PORT}${NC}"
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
# RESET ALL CONFIGURATIONS
# --------------------------
reset_all_configurations() {
    clear
    print_header "TÜM YAPILANDIRMALARI SIFIRLA"
    
    echo -e "${RED}⚠️  UYARI: Bu işlem GERİ ALINAMAZ!${NC}"
    echo -e "${YELLOW}Şunlar silinecek:${NC}"
    echo ""
    echo -e "  • Tüm PM2 servisleri"
    echo -e "  • Tüm Nginx yapılandırmaları"
    echo -e "  • Tüm SSL sertifikaları"
    echo -e "  • N8N kurulumu ve verileri"
    echo -e "  • CasaOS kurulumu ve verileri"
    echo -e "  • Redis yapılandırması"
    echo ""
    echo -e "${RED}NOT: Proje dosyaları (/root/final_versiyonn) SİLİNMEYECEK${NC}"
    echo ""
    
    read -p "Devam etmek istediğinizden emin misiniz? (EVET yazın): " confirmation
    
    if [ "$confirmation" != "EVET" ]; then
        echo -e "${YELLOW}İşlem iptal edildi.${NC}"
        return
    fi
    
    echo ""
    echo -e "${YELLOW}Son kez soruyor: GERÇEKTEN tüm yapılandırmalar silinsin mi? [e/H]: ${NC}"
    read -p "" -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Ee]$ ]]; then
        echo -e "${YELLOW}İşlem iptal edildi.${NC}"
        return
    fi
    
    echo ""
    print_header "Sıfırlama İşlemi Başlıyor..."
    
    # 1. Stop and delete all PM2 processes
    echo -e "${BLUE}[1/8] PM2 servisleri durduruluyor ve siliniyor...${NC}"
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    pm2 save --force 2>/dev/null || true
    rm -rf /root/.pm2 2>/dev/null || true
    echo -e "${GREEN}✅ PM2 servisleri temizlendi${NC}"
    
    # 2. Remove all Nginx configurations
    echo -e "${BLUE}[2/8] Nginx yapılandırmaları siliniyor...${NC}"
    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/n8n
    rm -f /etc/nginx/sites-enabled/casaos
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/n8n
    rm -f /etc/nginx/sites-available/casaos
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx yapılandırmaları temizlendi${NC}"
    
    # 3. Remove all SSL certificates
    echo -e "${BLUE}[3/8] SSL sertifikaları siliniyor...${NC}"
    certbot delete --cert-name $MAIN_DOMAIN --non-interactive 2>/dev/null || true
    certbot delete --cert-name $API_DOMAIN --non-interactive 2>/dev/null || true
    certbot delete --cert-name $ADMIN_DOMAIN --non-interactive 2>/dev/null || true
    certbot delete --cert-name $N8N_DOMAIN --non-interactive 2>/dev/null || true
    certbot delete --cert-name $CASAOS_DOMAIN --non-interactive 2>/dev/null || true
    echo -e "${GREEN}✅ SSL sertifikaları temizlendi${NC}"
    
    # 4. Remove N8N completely
    echo -e "${BLUE}[4/8] N8N kaldırılıyor...${NC}"
    npm uninstall -g n8n 2>/dev/null || true
    rm -rf $N8N_DIR 2>/dev/null || true
    echo -e "${GREEN}✅ N8N kaldırıldı${NC}"
    
    # 5. Remove CasaOS completely
    echo -e "${BLUE}[5/8] CasaOS kaldırılıyor...${NC}"
    systemctl stop casaos 2>/dev/null || true
    systemctl disable casaos 2>/dev/null || true
    if [ -f "/usr/bin/casaos-uninstall" ]; then
        /usr/bin/casaos-uninstall 2>/dev/null || true
    fi
    rm -rf /var/lib/casaos 2>/dev/null || true
    rm -rf /etc/casaos 2>/dev/null || true
    rm -rf /usr/share/casaos 2>/dev/null || true
    rm -f /usr/bin/casaos* 2>/dev/null || true
    rm -f /etc/systemd/system/casaos* 2>/dev/null || true
    systemctl daemon-reload
    echo -e "${GREEN}✅ CasaOS kaldırıldı${NC}"
    
    # 6. Reset Redis configuration
    echo -e "${BLUE}[6/8] Redis yapılandırması sıfırlanıyor...${NC}"
    systemctl stop redis-server
    cp /etc/redis/redis.conf /etc/redis/redis.conf.backup.reset.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    apt install --reinstall -y redis-server
    systemctl start redis-server
    echo -e "${GREEN}✅ Redis varsayılan yapılandırmasına döndürüldü${NC}"
    
    # 7. Clean up node_modules and build files
    echo -e "${BLUE}[7/8] Proje build dosyaları temizleniyor...${NC}"
    [ -d "$MAIN_DIR/.next" ] && rm -rf "$MAIN_DIR/.next"
    [ -d "$MAIN_DIR/node_modules" ] && rm -rf "$MAIN_DIR/node_modules"
    [ -d "$API_DIR/node_modules" ] && rm -rf "$API_DIR/node_modules"
    [ -d "$ADMIN_DIR/.next" ] && rm -rf "$ADMIN_DIR/.next"
    [ -d "$ADMIN_DIR/node_modules" ] && rm -rf "$ADMIN_DIR/node_modules"
    echo -e "${GREEN}✅ Build dosyaları temizlendi${NC}"
    
    # 8. Clean up logs
    echo -e "${BLUE}[8/8] Log dosyaları temizleniyor...${NC}"
    [ -d "$MAIN_DIR/logs" ] && rm -rf "$MAIN_DIR/logs"
    [ -d "$API_DIR/logs" ] && rm -rf "$API_DIR/logs"
    [ -d "$ADMIN_DIR/logs" ] && rm -rf "$ADMIN_DIR/logs"
    [ -d "$AI_DIR/logs" ] && rm -rf "$AI_DIR/logs"
    echo -e "${GREEN}✅ Log dosyaları temizlendi${NC}"
    
    echo ""
    print_header "Sıfırlama Tamamlandı!"
    echo ""
    echo -e "${GREEN}✅ Tüm yapılandırmalar başarıyla silindi!${NC}"
    echo ""
    echo -e "${YELLOW}Sistemde kalan bileşenler:${NC}"
    echo -e "  • Node.js ve npm"
    echo -e "  • Nginx (varsayılan yapılandırma)"
    echo -e "  • Redis (varsayılan yapılandırma)"
    echo -e "  • Proje dosyaları: /root/final_versiyonn"
    echo ""
    echo -e "${CYAN}Yeni kurulum yapmak için ana menüden '1' veya '2' seçeneğini kullanın.${NC}"
    echo ""
}
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
}