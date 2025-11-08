#!/bin/bash

# ========================================
# Huglu + N8N + AI Service Full Stack Deployment Script
# SDK Tools Disabled - Only Project Dependencies
# Debian 11 Bullseye Optimized
# Domains:
#   Main Site: plaxsy.com
#   API: api.plaxsy.com
#   Admin: admin.plaxsy.com
#   N8N: otomasyon.plaxsy.com
# Services:
#   AI/ML Service: localhost:8001 (internal only)
# ========================================

set -e

# --------------------------
# Colors
# --------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --------------------------
# Variables
# --------------------------
# Main Site
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

# AI/ML Service
AI_DIR="/root/final_versiyonn/ml-service"
AI_PORT=8001
AI_PM2_NAME="ml-service"

# N8N
N8N_DOMAIN="otomasyon.plaxsy.com"
N8N_PORT=5678
N8N_USER=$(whoami)
N8N_DIR="/home/$N8N_USER/n8n"

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

# --------------------------
# Root Check
# --------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run as root!${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Prepared for Debian 11 Bullseye${NC}"
echo -e "${BLUE}========================================${NC}"

# --------------------------
# Cleanup Function
# --------------------------
cleanup_and_fix() {
    echo -e "${YELLOW}[FIX] Cleaning existing PM2 and Nginx configurations...${NC}"
    pm2 delete $MAIN_PM2_NAME 2>/dev/null || true
    pm2 delete $API_PM2_NAME 2>/dev/null || true
    pm2 delete $ADMIN_PM2_NAME 2>/dev/null || true
    pm2 delete $AI_PM2_NAME 2>/dev/null || true
    # Don't remove N8N if it's running
    if ! pm2 describe n8n &>/dev/null || ! pm2 list | grep -q "n8n.*online"; then
        pm2 delete n8n 2>/dev/null || true
    fi

    rm -f /etc/nginx/sites-enabled/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/$API_DOMAIN
    rm -f /etc/nginx/sites-enabled/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-available/$MAIN_DOMAIN
    rm -f /etc/nginx/sites-available/$API_DOMAIN
    rm -f /etc/nginx/sites-available/$ADMIN_DOMAIN
    rm -f /etc/nginx/sites-enabled/default
}

cleanup_and_fix

# --------------------------
# System Update and Packages
# --------------------------
echo -e "${BLUE}[1/8] Updating system...${NC}"
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

# --------------------------
# Redis Installation and Configuration (No Password)
# --------------------------
echo -e "${BLUE}[2/8] Installing and configuring Redis...${NC}"

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

# Replication
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-disable-tcp-nodelay no
replica-priority 100

# Security - NO PASSWORD
# requirepass command is commented - passwordless access
# protected-mode yes means only accessible from localhost

# Limits
maxclients 10000

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Lazy Freeing
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no

# Append Only File
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Lua scripting
lua-time-limit 5000

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency monitor
latency-monitor-threshold 0

# Event notification
notify-keyspace-events ""

# Advanced config
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
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
        REDIS_VERSION=$(redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')
        echo -e "${GREEN}   Redis Version: $REDIS_VERSION${NC}"
    else
        echo -e "${RED}❌ Redis connection test failed${NC}"
    fi
else
    echo -e "${RED}❌ Redis failed to start! Check logs: journalctl -u redis-server${NC}"
fi

# --------------------------
# Node.js and PM2
# --------------------------
echo -e "${BLUE}[3/8] Installing Node.js and PM2...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

npm install -g pm2 npm@latest

node --version
npm --version

# --------------------------
# Clone Repository and Check Directories
# --------------------------
echo -e "${BLUE}[4/8] Cloning repository...${NC}"
if [ ! -d "/root/final_versiyonn" ]; then
    git clone https://github.com/berat-eth/final_versiyonn.git /root/final_versiyonn
else
    cd /root/final_versiyonn
    git pull origin main || git pull origin master || true
fi

# --------------------------
# Main Site Setup (plaxsy.com - Next.js)
# --------------------------
echo -e "${BLUE}[5/8] Setting up main site (Next.js - plaxsy.com)...${NC}"
if [ -d "$MAIN_DIR" ]; then
    cd $MAIN_DIR
    
    echo -e "${YELLOW}Installing Next.js dependencies...${NC}"
    npm install
    
    # Next.js build
    echo -e "${YELLOW}Building Next.js production...${NC}"
    npm run build
    
    # Create PM2 ecosystem file
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
    },
    error_file: '${MAIN_DIR}/logs/error.log',
    out_file: '${MAIN_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF
    
    # Create log directory
    mkdir -p logs
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    echo -e "${GREEN}✅ Next.js main site successfully installed${NC}"
else
    echo -e "${YELLOW}⚠️  Web directory not found: $MAIN_DIR${NC}"
    echo -e "${YELLOW}Skipping Next.js project...${NC}"
    SKIP_MAIN=true
fi

# --------------------------
# API Setup
# --------------------------
echo -e "${BLUE}[6/8] Setting up API...${NC}"
if [ -d "$API_DIR" ]; then
    cd $API_DIR
    
    # Create/update .env file for API
    if [ -f ".env" ]; then
        # If .env exists, add Redis settings
        if ! grep -q "REDIS_HOST" .env; then
            echo "" >> .env
            echo "# Redis Configuration (No Password)" >> .env
            echo "REDIS_HOST=127.0.0.1" >> .env
            echo "REDIS_PORT=${REDIS_PORT}" >> .env
        fi
        # Add AI service URL
        if ! grep -q "AI_SERVICE_URL" .env; then
            echo "" >> .env
            echo "# AI/ML Service Configuration" >> .env
            echo "AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}" >> .env
        fi
    else
        # Create .env if it doesn't exist
        cat > .env << ENVEOF
# Redis Configuration (No Password)
REDIS_HOST=127.0.0.1
REDIS_PORT=${REDIS_PORT}

# AI/ML Service Configuration
AI_SERVICE_URL=http://127.0.0.1:${AI_PORT}
ENVEOF
    fi
    
    npm install --production
    pm2 start server.js --name $API_PM2_NAME --time --log-date-format="YYYY-MM-DD HH:mm:ss" --max-memory-restart 500M
    pm2 save
    echo -e "${GREEN}✅ API successfully installed (with Redis and AI service integration)${NC}"
else
    echo -e "${YELLOW}⚠️  API directory not found: $API_DIR${NC}"
fi

# --------------------------
# Admin Panel Setup
# --------------------------
if [ -d "$ADMIN_DIR" ]; then
    echo -e "${BLUE}Setting up Admin Panel...${NC}"
    cd $ADMIN_DIR
    npm install
    npm run build
    PORT=$ADMIN_PORT pm2 start npm --name "$ADMIN_PM2_NAME" -- start
    pm2 save
    echo -e "${GREEN}✅ Admin panel successfully installed${NC}"
else
    echo -e "${YELLOW}⚠️  Admin directory not found, skipping...${NC}"
    SKIP_ADMIN=true
fi

# --------------------------
# AI/ML Service Setup (Python)
# --------------------------
echo -e "${BLUE}[7/8] Setting up AI/ML Service (Python)...${NC}"
if [ -d "$AI_DIR" ]; then
    cd $AI_DIR
    
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    
    # Upgrade pip
    python3 -m pip install --upgrade pip
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
        echo -e "${GREEN}✅ Python dependencies installed${NC}"
    else
        echo -e "${RED}❌ requirements.txt not found in $AI_DIR${NC}"
        SKIP_AI=true
    fi
    
    # Check if main.py exists
    if [ ! -f "main.py" ] && [ "$SKIP_AI" != true ]; then
        echo -e "${RED}❌ main.py not found in $AI_DIR${NC}"
        SKIP_AI=true
    fi
    
    if [ "$SKIP_AI" != true ]; then
        # Create log directory
        mkdir -p logs
        
        # Create PM2 ecosystem file for Python service
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${AI_PM2_NAME}',
    script: 'python3',
    args: 'main.py',
    cwd: '${AI_DIR}',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      PORT: ${AI_PORT},
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: ${REDIS_PORT},
      PYTHONUNBUFFERED: '1'
    },
    error_file: '${AI_DIR}/logs/error.log',
    out_file: '${AI_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF
        
        # Start with PM2
        pm2 start ecosystem.config.js
        pm2 save
        
        echo -e "${GREEN}✅ AI/ML Service successfully installed and started${NC}"
        echo -e "${GREEN}   Service URL: http://localhost:${AI_PORT} (internal only)${NC}"
        
        # Wait a bit and check if service is running
        sleep 3
        if pm2 describe $AI_PM2_NAME &>/dev/null && pm2 list | grep -q "${AI_PM2_NAME}.*online"; then
            echo -e "${GREEN}✅ AI/ML Service is running${NC}"
        else
            echo -e "${YELLOW}⚠️  AI/ML Service may have issues. Check logs: pm2 logs ${AI_PM2_NAME}${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  AI/ML Service directory not found: $AI_DIR${NC}"
    echo -e "${YELLOW}Skipping AI/ML Service installation...${NC}"
    SKIP_AI=true
fi

# --------------------------
# N8N Installation Check and Setup
# --------------------------
echo -e "${BLUE}[8/8] Checking N8N...${NC}"

# Check if N8N is already installed and running
N8N_INSTALLED=false
N8N_RUNNING=false

if command -v n8n &>/dev/null; then
    echo -e "${GREEN}✅ N8N binary found${NC}"
    N8N_INSTALLED=true
fi

if pm2 describe n8n &>/dev/null; then
    if pm2 list | grep -q "n8n.*online"; then
        echo -e "${GREEN}✅ N8N is running in PM2${NC}"
        N8N_RUNNING=true
    fi
fi

# Check N8N database
if [ -f "$N8N_DIR/.n8n/database.sqlite" ]; then
    echo -e "${GREEN}✅ N8N database exists${NC}"
fi

# Skip if N8N is installed AND running
if [ "$N8N_INSTALLED" = true ] && [ "$N8N_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  N8N is already installed and running, skipping installation...${NC}"
    SKIP_N8N=true
else
    echo -e "${BLUE}Installing N8N...${NC}"
    
    # Install N8N binary if not installed
    if [ "$N8N_INSTALLED" = false ]; then
        echo -e "${YELLOW}Installing N8N binary...${NC}"
        npm install -g n8n --ignore-scripts
    fi
    
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

    # Start N8N
    su - $N8N_USER -c "cd $N8N_DIR && pm2 start ecosystem.config.js && pm2 save"
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $N8N_USER --hp /home/$N8N_USER
    echo -e "${GREEN}✅ N8N successfully installed (with Redis integration)${NC}"
fi

# --------------------------
# Nginx Configuration
# --------------------------
echo -e "${BLUE}Configuring Nginx...${NC}"

# Main Site (plaxsy.com)
if [ "$SKIP_MAIN" != true ]; then
cat > /etc/nginx/sites-available/$MAIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name plaxsy.com www.plaxsy.com;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:3006;
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
EOF
ln -sf /etc/nginx/sites-available/$MAIN_DOMAIN /etc/nginx/sites-enabled/
fi

# API
cat > /etc/nginx/sites-available/$API_DOMAIN << 'EOF'
server {
    listen 80;
    server_name api.plaxsy.com;
    
    client_max_body_size 100M;
    
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
    }
}
EOF
ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/

# Admin
if [ "$SKIP_ADMIN" != true ]; then
cat > /etc/nginx/sites-available/$ADMIN_DOMAIN << 'EOF'
server {
    listen 80;
    server_name admin.plaxsy.com;
    
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
    }
}
EOF
ln -sf /etc/nginx/sites-available/$ADMIN_DOMAIN /etc/nginx/sites-enabled/
fi

# N8N - Only for new installation or if config doesn't exist
if [ "$SKIP_N8N" != true ] || [ ! -f "/etc/nginx/sites-available/n8n" ]; then
cat > /etc/nginx/sites-available/n8n << 'EOF'
server {
    listen 80;
    server_name otomasyon.plaxsy.com;
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
EOF
ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
fi

# Nginx test and reload
nginx -t && systemctl reload nginx

# --------------------------
# Certbot SSL
# --------------------------
echo -e "${BLUE}Installing SSL certificates...${NC}"

# Main site SSL
if [ "$SKIP_MAIN" != true ]; then
    certbot --nginx -d $MAIN_DOMAIN -d www.$MAIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi

# API SSL
certbot --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true

# Admin SSL
if [ "$SKIP_ADMIN" != true ]; then
    certbot --nginx -d $ADMIN_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi

# N8N SSL - Only for new installation
if [ "$SKIP_N8N" != true ]; then
    certbot --nginx -d $N8N_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect || true
fi

# Auto renewal
(crontab -l 2>/dev/null | grep -F "certbot renew") || (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# --------------------------
# Remove SDK Tools (if installed)
# --------------------------
echo -e "${BLUE}Removing SDK tools (if installed)...${NC}"

# Remove Java
if command -v java &> /dev/null; then
    echo -e "${YELLOW}Removing Java...${NC}"
    apt remove -y java-*-amazon-corretto-jdk 2>/dev/null || true
    apt autoremove -y
fi

# Remove Android SDK
if [ -d "/opt/android-sdk" ]; then
    echo -e "${YELLOW}Removing Android SDK...${NC}"
    rm -rf /opt/android-sdk
fi

# Remove Gradle
if command -v gradle &> /dev/null; then
    echo -e "${YELLOW}Removing Gradle...${NC}"
    rm -f /usr/bin/gradle
    rm -rf /opt/gradle-*
fi

# Remove Flutter
if [ -d "/opt/flutter" ]; then
    echo -e "${YELLOW}Removing Flutter...${NC}"
    rm -rf /opt/flutter
fi

# Remove APK output directory
if [ -d "/root/apk-builds" ]; then
    echo -e "${YELLOW}Removing APK builds directory...${NC}"
    rm -rf /root/apk-builds
fi

# Clean bashrc from SDK exports
if [ -f "/root/.bashrc" ]; then
    echo -e "${YELLOW}Cleaning .bashrc from SDK exports...${NC}"
    sed -i '/JAVA_HOME/d' /root/.bashrc
    sed -i '/ANDROID_SDK_ROOT/d' /root/.bashrc
    sed -i '/ANDROID_HOME/d' /root/.bashrc
    sed -i '/android-sdk/d' /root/.bashrc
    sed -i '/flutter/d' /root/.bashrc
    sed -i '/gradle/d' /root/.bashrc
fi

echo -e "${GREEN}✅ SDK tools removed successfully${NC}"

# --------------------------
# Firewall Setup
# --------------------------
echo -e "${BLUE}Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# --------------------------
# PM2 Startup
# --------------------------
pm2 startup systemd
pm2 save

# --------------------------
# Final Status
# --------------------------
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Services Status:${NC}"
pm2 list
echo ""
echo -e "${BLUE}Nginx Status:${NC}"
systemctl status nginx --no-pager
echo ""
echo -e "${BLUE}Redis Status:${NC}"
systemctl status redis-server --no-pager
echo ""
echo -e "${GREEN}Domains:${NC}"
if [ "$SKIP_MAIN" != true ]; then
    echo -e "  Main: https://$MAIN_DOMAIN"
fi
echo -e "  API: https://$API_DOMAIN"
if [ "$SKIP_ADMIN" != true ]; then
    echo -e "  Admin: https://$ADMIN_DOMAIN"
fi
if [ "$SKIP_N8N" != true ]; then
    echo -e "  N8N: https://$N8N_DOMAIN"
fi
echo ""
echo -e "${GREEN}Internal Services:${NC}"
if [ "$SKIP_AI" != true ]; then
    echo -e "  AI/ML Service: http://localhost:${AI_PORT} (internal only)"
fi
echo ""
echo -e "${BLUE}System Architecture:${NC}"
echo -e "  Mobile App → Event tracking → MySQL + Redis queue"
echo -e "  Redis queue → Python ML Service → Model inference → MySQL"
echo -e "  Admin Panel → Node.js API → MySQL → ML results display"
echo ""
echo -e "${YELLOW}Note: SDK tools (Java, Android SDK, Gradle) were NOT installed${NC}"
echo -e "${YELLOW}Only project dependencies were installed${NC}"
echo ""
if [ "$SKIP_AI" != true