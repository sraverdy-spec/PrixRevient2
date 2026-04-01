#!/bin/bash
#===============================================================================
# PrixRevient - Installation Serveur Interne Ubuntu
# Compatible : Ubuntu 20.04 / 22.04 / 24.04 LTS
# Usage : sudo bash install-interne.sh
#
# Ce script installe l'application PrixRevient sur un serveur Ubuntu interne.
# Il demande les informations necessaires, installe les dependances,
# configure les services et genere un rapport de verification.
#===============================================================================

set -e

# ==================== COULEURS ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }
log_ok()      { echo -e "${GREEN}[  OK  ]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $1"; }
log_error()   { echo -e "${RED}[ERREUR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}=== $1 ===${NC}"; }
log_substep() { echo -e "  ${BLUE}->>${NC} $1"; }

# ==================== VARIABLES ====================
APP_NAME="prixrevient"
APP_DIR="/opt/$APP_NAME"
APP_USER="prixrevient"
MONGO_DB_NAME="cost_calculator"
BACKEND_PORT=8001
REPORT_FILE="/opt/$APP_NAME/rapport_installation.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ERRORS=0
WARNINGS=0

# ==================== FONCTIONS UTILITAIRES ====================
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Ce script doit etre execute en tant que root (sudo bash install-interne.sh)"
        exit 1
    fi
}

check_ubuntu() {
    if [ ! -f /etc/os-release ]; then
        log_error "Systeme non supporte"
        exit 1
    fi
    . /etc/os-release
    if [ "$ID" != "ubuntu" ]; then
        log_warn "Ce script est prevu pour Ubuntu. OS detecte: $ID $VERSION_ID"
        read -p "Continuer quand meme ? (o/n) : " CONT
        if [ "$CONT" != "o" ]; then exit 1; fi
    fi
    log_ok "OS: $PRETTY_NAME"
}

# ==================== COLLECTE DES INFORMATIONS ====================
collect_info() {
    log_step "CONFIGURATION DE L'INSTALLATION"
    echo ""
    echo -e "${BOLD}Repondez aux questions suivantes pour configurer l'application.${NC}"
    echo ""

    # URL d'acces
    echo -e "${YELLOW}L'URL d'acces est l'adresse a laquelle les utilisateurs accederont a l'application.${NC}"
    echo -e "${YELLOW}Exemples:${NC}"
    echo -e "  - https://calculprix.mon-entreprise.com  (si vous avez un nom de domaine + SSL)"
    echo -e "  - http://192.168.1.100                   (acces par IP sur reseau interne)"
    echo -e "  - http://serveur-prixrevient.local        (acces par nom d'hote)"
    echo ""
    read -p "URL d'acces a l'application : " APP_URL
    while [ -z "$APP_URL" ]; do
        log_error "L'URL est obligatoire"
        read -p "URL d'acces a l'application : " APP_URL
    done
    # Retirer le / final si present
    APP_URL="${APP_URL%/}"

    echo ""
    # SSL
    if [[ "$APP_URL" == https://* ]]; then
        USE_SSL="oui"
        DOMAIN=$(echo "$APP_URL" | sed 's|https://||' | cut -d'/' -f1)
        echo -e "${YELLOW}SSL detecte. Voulez-vous installer un certificat Let's Encrypt ?${NC}"
        echo -e "  (Necesssite que le domaine $DOMAIN pointe vers ce serveur et le port 80 ouvert)"
        read -p "Installer Let's Encrypt ? (o/n) [n] : " USE_LETSENCRYPT
        USE_LETSENCRYPT="${USE_LETSENCRYPT:-n}"
    else
        USE_SSL="non"
        DOMAIN=$(echo "$APP_URL" | sed 's|http://||' | cut -d'/' -f1 | cut -d':' -f1)
        USE_LETSENCRYPT="n"
    fi

    echo ""
    # Admin
    read -p "Email administrateur [admin@example.com] : " ADMIN_EMAIL
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"

    read -sp "Mot de passe administrateur [Admin123!] : " ADMIN_PASSWORD
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"
    echo ""

    echo ""
    # MongoDB
    read -p "URL MongoDB [mongodb://localhost:27017] : " MONGO_URL
    MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"

    echo ""
    log_step "RESUME DE LA CONFIGURATION"
    echo -e "  URL d'acces          : ${GREEN}$APP_URL${NC}"
    echo -e "  Domaine/IP           : ${GREEN}$DOMAIN${NC}"
    echo -e "  SSL                  : ${GREEN}$USE_SSL${NC}"
    echo -e "  Let's Encrypt        : ${GREEN}$USE_LETSENCRYPT${NC}"
    echo -e "  Email admin          : ${GREEN}$ADMIN_EMAIL${NC}"
    echo -e "  MongoDB              : ${GREEN}$MONGO_URL${NC}"
    echo -e "  Repertoire           : ${GREEN}$APP_DIR${NC}"
    echo ""
    read -p "Confirmer et lancer l'installation ? (o/n) : " CONFIRM
    if [ "$CONFIRM" != "o" ]; then
        log_warn "Installation annulee"
        exit 0
    fi
}

# ==================== ETAPE 1 : PRE-REQUIS SYSTEME ====================
install_prerequisites() {
    log_step "ETAPE 1/9 : PRE-REQUIS SYSTEME"
    apt-get update -y > /dev/null 2>&1
    apt-get install -y curl wget gnupg2 git build-essential software-properties-common \
        python3 python3-pip python3-venv nginx unzip > /dev/null 2>&1

    # Verifier Python
    PYTHON_VER=$(python3 --version 2>&1 | awk '{print $2}')
    log_ok "Python $PYTHON_VER installe"

    # Verifier version Python pour numpy/pandas
    PYTHON_MINOR=$(echo "$PYTHON_VER" | cut -d'.' -f2)
    if [ "$PYTHON_MINOR" -lt 10 ]; then
        log_error "Python 3.10+ requis (version actuelle: $PYTHON_VER)"
        exit 1
    fi
    log_ok "Pre-requis systeme installes"
}

# ==================== ETAPE 2 : NODE.JS 20 ====================
install_nodejs() {
    log_step "ETAPE 2/9 : NODE.JS 20 LTS"

    if command -v node &> /dev/null; then
        NODE_VER=$(node -v | sed 's/v//')
        NODE_MAJOR=$(echo "$NODE_VER" | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 16 ] && [ "$NODE_MAJOR" -le 20 ]; then
            log_ok "Node.js v$NODE_VER deja installe et compatible"
            if ! command -v yarn &> /dev/null; then
                npm install -g yarn > /dev/null 2>&1
            fi
            return
        else
            log_warn "Node.js v$NODE_VER incompatible, reinstallation de Node 20..."
            apt-get remove -y nodejs > /dev/null 2>&1 || true
            rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null
        fi
    fi

    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    npm install -g yarn > /dev/null 2>&1
    log_ok "Node.js $(node -v) + Yarn $(yarn -v) installes"
}

# ==================== ETAPE 3 : MONGODB ====================
install_mongodb() {
    log_step "ETAPE 3/9 : MONGODB"

    if command -v mongod &> /dev/null; then
        log_ok "MongoDB deja installe"
        systemctl enable mongod > /dev/null 2>&1 || true
        systemctl start mongod > /dev/null 2>&1 || true
        return
    fi

    . /etc/os-release
    CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")

    log_substep "Installation de MongoDB 7..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg 2>/dev/null
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    apt-get update > /dev/null 2>&1
    apt-get install -y mongodb-org > /dev/null 2>&1

    systemctl daemon-reload
    systemctl enable mongod
    systemctl start mongod
    sleep 3

    if systemctl is-active --quiet mongod; then
        log_ok "MongoDB installe et demarre"
    else
        log_error "MongoDB n'a pas demarre"
        ERRORS=$((ERRORS+1))
    fi
}

# ==================== ETAPE 4 : UTILISATEUR SYSTEME ====================
create_app_user() {
    log_step "ETAPE 4/9 : UTILISATEUR SYSTEME"
    if id "$APP_USER" &>/dev/null; then
        log_ok "Utilisateur $APP_USER existe deja"
    else
        useradd --system --create-home --shell /bin/bash "$APP_USER"
        log_ok "Utilisateur $APP_USER cree"
    fi
}

# ==================== ETAPE 5 : DEPLOIEMENT APPLICATION ====================
deploy_application() {
    log_step "ETAPE 5/9 : DEPLOIEMENT APPLICATION"

    mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend" "$APP_DIR/backend/import_watch/processed"

    # Detecter si les fichiers source sont dans le meme dossier que le script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ -f "$SCRIPT_DIR/backend/server.py" ]; then
        log_substep "Copie des fichiers depuis $SCRIPT_DIR..."
        cp "$SCRIPT_DIR/backend/server.py" "$APP_DIR/backend/"
        cp "$SCRIPT_DIR/backend/requirements.txt" "$APP_DIR/backend/"
        cp -r "$SCRIPT_DIR/frontend/src" "$APP_DIR/frontend/"
        cp "$SCRIPT_DIR/frontend/package.json" "$APP_DIR/frontend/"
        [ -f "$SCRIPT_DIR/frontend/tailwind.config.js" ] && cp "$SCRIPT_DIR/frontend/tailwind.config.js" "$APP_DIR/frontend/"
        [ -f "$SCRIPT_DIR/frontend/jsconfig.json" ] && cp "$SCRIPT_DIR/frontend/jsconfig.json" "$APP_DIR/frontend/"
        [ -d "$SCRIPT_DIR/frontend/public" ] && cp -r "$SCRIPT_DIR/frontend/public" "$APP_DIR/frontend/"
        [ -d "$SCRIPT_DIR/docs" ] && cp -r "$SCRIPT_DIR/docs" "$APP_DIR/"
    else
        log_error "Fichiers source non trouves dans $SCRIPT_DIR"
        log_error "Assurez-vous que install-interne.sh est dans le meme dossier que backend/ et frontend/"
        exit 1
    fi

    # ---- BACKEND ----
    log_substep "Configuration du backend Python..."
    cd "$APP_DIR/backend"

    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate

    # Corriger numpy/pandas pour Python 3.10
    PYTHON_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
    if [ "$PYTHON_MINOR" -lt 11 ]; then
        log_substep "Ajustement des dependances pour Python 3.$PYTHON_MINOR..."
        sed -i 's/numpy==2\.[3-9]\.[0-9]*/numpy==2.2.6/' requirements.txt
        sed -i 's/numpy==2\.4\.[0-9]*/numpy==2.2.6/' requirements.txt
        sed -i 's/pandas==3\.[0-9]\.[0-9]*/pandas==2.2.3/' requirements.txt
    fi

    pip install --upgrade pip > /dev/null 2>&1
    pip install -r requirements.txt > /dev/null 2>&1
    deactivate

    # Creer le .env backend
    cat > "$APP_DIR/backend/.env" << ENVBACK
MONGO_URL=$MONGO_URL
DB_NAME=$MONGO_DB_NAME
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
FRONTEND_URL=$APP_URL
ENVBACK

    log_ok "Backend configure"

    # ---- FRONTEND ----
    log_substep "Configuration du frontend React..."
    cd "$APP_DIR/frontend"

    # Creer le .env frontend avec la bonne URL
    cat > "$APP_DIR/frontend/.env" << ENVFRONT
REACT_APP_BACKEND_URL=$APP_URL
ENVFRONT

    log_ok "REACT_APP_BACKEND_URL = $APP_URL"

    yarn install --silent > /dev/null 2>&1
    yarn build > /dev/null 2>&1
    log_ok "Frontend compile"

    # Permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    log_ok "Application deployee dans $APP_DIR"
}

# ==================== ETAPE 6 : SERVICE SYSTEMD ====================
configure_service() {
    log_step "ETAPE 6/9 : SERVICE SYSTEMD"

    cat > /etc/systemd/system/prixrevient-backend.service << SVCFILE
[Unit]
Description=PrixRevient Backend (FastAPI)
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin:/usr/local/bin:/usr/bin
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn server:app \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --workers 4 \\
    --bind 0.0.0.0:$BACKEND_PORT \\
    --timeout 120 \\
    --access-logfile /var/log/prixrevient/backend-access.log \\
    --error-logfile /var/log/prixrevient/backend-error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCFILE

    # Creer le dossier de logs
    mkdir -p /var/log/prixrevient
    chown -R "$APP_USER:$APP_USER" /var/log/prixrevient

    systemctl daemon-reload
    systemctl enable prixrevient-backend
    systemctl start prixrevient-backend
    sleep 4

    if systemctl is-active --quiet prixrevient-backend; then
        log_ok "Service prixrevient-backend actif"
    else
        log_error "Service prixrevient-backend non demarre"
        journalctl -u prixrevient-backend --no-pager -n 20
        ERRORS=$((ERRORS+1))
    fi
}

# ==================== ETAPE 7 : NGINX ====================
configure_nginx() {
    log_step "ETAPE 7/9 : NGINX"

    if [ "$USE_SSL" = "oui" ]; then
        # Config avec SSL (sera active apres Let's Encrypt ou manuellement)
        cat > /etc/nginx/sites-available/prixrevient << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root $APP_DIR/frontend/build;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # Frontend SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXCONF
    else
        # Config sans SSL (HTTP uniquement - reseau interne)
        cat > /etc/nginx/sites-available/prixrevient << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN _;

    root $APP_DIR/frontend/build;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # Frontend SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXCONF
    fi

    # Activer le site
    ln -sf /etc/nginx/sites-available/prixrevient /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null

    # Tester la config
    if nginx -t 2>/dev/null; then
        systemctl restart nginx
        log_ok "Nginx configure et demarre"
    else
        log_error "Erreur de configuration Nginx"
        nginx -t
        ERRORS=$((ERRORS+1))
    fi
}

# ==================== ETAPE 8 : LET'S ENCRYPT (optionnel) ====================
configure_ssl() {
    log_step "ETAPE 8/9 : CERTIFICAT SSL"

    if [ "$USE_LETSENCRYPT" = "o" ]; then
        if ! command -v certbot &> /dev/null; then
            apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
        fi
        log_substep "Generation du certificat pour $DOMAIN..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$ADMIN_EMAIL" --redirect || {
            log_warn "Let's Encrypt a echoue. Verifiez que le domaine pointe vers ce serveur et que le port 80 est ouvert."
            WARNINGS=$((WARNINGS+1))
        }
    else
        log_ok "SSL ignore (reseau interne ou pas de domaine)"
    fi
}

# ==================== ETAPE 9 : BACKUP + OUTILS ====================
setup_extras() {
    log_step "ETAPE 9/9 : OUTILS COMPLEMENTAIRES"

    # Script de backup
    mkdir -p /opt/backups
    cat > /opt/backups/backup_prixrevient.sh << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/opt/backups/mongo"
mkdir -p "$BACKUP_DIR"
FILENAME="$BACKUP_DIR/cost_calculator_$(date +%Y%m%d_%H%M%S)"
mongodump --db cost_calculator --out "$FILENAME" 2>/dev/null
# Garder les 30 derniers backups
ls -dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +31 | xargs rm -rf 2>/dev/null
echo "Backup: $FILENAME"
BACKUP
    chmod +x /opt/backups/backup_prixrevient.sh

    # Cron backup quotidien a 2h
    (crontab -l 2>/dev/null | grep -v backup_prixrevient; echo "0 2 * * * /opt/backups/backup_prixrevient.sh > /dev/null 2>&1") | crontab -
    log_ok "Backup automatique configure (quotidien 02:00)"

    # Script de mise a jour
    cat > "$APP_DIR/update.sh" << 'UPDATESH'
#!/bin/bash
set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
APP_DIR="/opt/prixrevient"
ZIP_URL="$1"

if [ -z "$ZIP_URL" ]; then
    echo -e "${RED}Usage: sudo bash update.sh URL_OU_CHEMIN_DU_ZIP${NC}"
    exit 1
fi

echo -e "${BLUE}[1/7] Backup...${NC}"
/opt/backups/backup_prixrevient.sh 2>/dev/null || echo "Backup ignore"

echo -e "${BLUE}[2/7] Telechargement...${NC}"
cd /tmp
rm -rf prixrevient-update prixrevient-deploy.zip
if [[ "$ZIP_URL" == http* ]]; then
    wget -q -O prixrevient-deploy.zip "$ZIP_URL"
else
    cp "$ZIP_URL" prixrevient-deploy.zip
fi
unzip -qo prixrevient-deploy.zip -d prixrevient-update

echo -e "${BLUE}[3/7] Arret backend...${NC}"
sudo systemctl stop prixrevient-backend

echo -e "${BLUE}[4/7] Backend...${NC}"
cp /tmp/prixrevient-update/backend/server.py $APP_DIR/backend/
cp /tmp/prixrevient-update/backend/requirements.txt $APP_DIR/backend/
cd $APP_DIR/backend
PYTHON_MINOR=$(venv/bin/python3 -c "import sys; print(sys.version_info.minor)")
if [ "$PYTHON_MINOR" -lt 11 ]; then
    sed -i 's/numpy==2\.[3-9]\.[0-9]*/numpy==2.2.6/' requirements.txt
    sed -i 's/numpy==2\.4\.[0-9]*/numpy==2.2.6/' requirements.txt
    sed -i 's/pandas==3\.[0-9]\.[0-9]*/pandas==2.2.3/' requirements.txt
fi
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

echo -e "${BLUE}[5/7] Frontend (sans ecraser .env)...${NC}"
cp -r /tmp/prixrevient-update/frontend/src $APP_DIR/frontend/
cp /tmp/prixrevient-update/frontend/package.json $APP_DIR/frontend/
cd $APP_DIR/frontend
yarn install --silent
yarn build

echo -e "${BLUE}[6/7] Redemarrage...${NC}"
sudo systemctl start prixrevient-backend
sleep 3

echo -e "${BLUE}[7/7] Verification...${NC}"
if systemctl is-active --quiet prixrevient-backend; then
    echo -e "${GREEN}Backend : OK${NC}"
else
    echo -e "${RED}Backend : ERREUR${NC}"
    sudo journalctl -u prixrevient-backend --no-pager -n 20
fi
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/auth/me)
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}API : OK (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}API : HTTP $HTTP_CODE${NC}"
fi
rm -rf /tmp/prixrevient-update /tmp/prixrevient-deploy.zip
echo -e "${GREEN}Mise a jour terminee !${NC}"
UPDATESH
    chmod +x "$APP_DIR/update.sh"
    log_ok "Script de mise a jour installe ($APP_DIR/update.sh)"

    # Premier backup
    /opt/backups/backup_prixrevient.sh > /dev/null 2>&1 || true
    log_ok "Premier backup effectue"
}

# ==================== RAPPORT DE VERIFICATION ====================
generate_report() {
    log_step "RAPPORT DE VERIFICATION"

    REPORT=""
    REPORT+="================================================================\n"
    REPORT+="  RAPPORT D'INSTALLATION - PrixRevient\n"
    REPORT+="  Date : $TIMESTAMP\n"
    REPORT+="  Serveur : $(hostname)\n"
    REPORT+="================================================================\n\n"

    # Test 1 : OS
    REPORT+="[SYSTEME]\n"
    . /etc/os-release
    REPORT+="  OS             : $PRETTY_NAME\n"
    REPORT+="  Python         : $(python3 --version 2>&1)\n"
    REPORT+="  Node.js        : $(node -v 2>&1)\n"
    REPORT+="  Yarn           : $(yarn -v 2>&1)\n\n"

    # Test 2 : Services
    REPORT+="[SERVICES]\n"
    SERVICES_OK=0
    SERVICES_TOTAL=3

    if systemctl is-active --quiet mongod; then
        REPORT+="  MongoDB        : ${GREEN}ACTIF${NC}\n"
        SERVICES_OK=$((SERVICES_OK+1))
    else
        REPORT+="  MongoDB        : ${RED}INACTIF${NC}\n"
        ERRORS=$((ERRORS+1))
    fi

    if systemctl is-active --quiet prixrevient-backend; then
        REPORT+="  Backend        : ${GREEN}ACTIF${NC}\n"
        SERVICES_OK=$((SERVICES_OK+1))
    else
        REPORT+="  Backend        : ${RED}INACTIF${NC}\n"
        ERRORS=$((ERRORS+1))
    fi

    if systemctl is-active --quiet nginx; then
        REPORT+="  Nginx          : ${GREEN}ACTIF${NC}\n"
        SERVICES_OK=$((SERVICES_OK+1))
    else
        REPORT+="  Nginx          : ${RED}INACTIF${NC}\n"
        ERRORS=$((ERRORS+1))
    fi
    REPORT+="\n"

    # Test 3 : API
    REPORT+="[API BACKEND]\n"
    API_OK=0
    API_TOTAL=3

    HTTP_AUTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/auth/me 2>/dev/null)
    if [ "$HTTP_AUTH" = "401" ]; then
        REPORT+="  GET /api/auth/me          : ${GREEN}OK${NC} (HTTP 401 = non authentifie, normal)\n"
        API_OK=$((API_OK+1))
    else
        REPORT+="  GET /api/auth/me          : ${RED}ERREUR${NC} (HTTP $HTTP_AUTH)\n"
        ERRORS=$((ERRORS+1))
    fi

    LOGIN_RESULT=$(curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)
    if echo "$LOGIN_RESULT" | grep -q "name\|email"; then
        REPORT+="  POST /api/auth/login      : ${GREEN}OK${NC} (Admin connecte)\n"
        API_OK=$((API_OK+1))
    else
        REPORT+="  POST /api/auth/login      : ${RED}ERREUR${NC} ($LOGIN_RESULT)\n"
        ERRORS=$((ERRORS+1))
    fi

    HTTP_DASH=$(curl -s -o /dev/null -w "%{http_code}" -c /tmp/test_cookies.txt \
        -X POST http://localhost:$BACKEND_PORT/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)
    HTTP_STATS=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/test_cookies.txt \
        http://localhost:$BACKEND_PORT/api/dashboard/stats 2>/dev/null)
    if [ "$HTTP_STATS" = "200" ]; then
        REPORT+="  GET /api/dashboard/stats  : ${GREEN}OK${NC}\n"
        API_OK=$((API_OK+1))
    else
        REPORT+="  GET /api/dashboard/stats  : ${YELLOW}HTTP $HTTP_STATS${NC}\n"
        WARNINGS=$((WARNINGS+1))
    fi
    rm -f /tmp/test_cookies.txt
    REPORT+="\n"

    # Test 4 : Frontend
    REPORT+="[FRONTEND]\n"
    if [ -f "$APP_DIR/frontend/build/index.html" ]; then
        REPORT+="  Build React    : ${GREEN}OK${NC} (build/index.html present)\n"
    else
        REPORT+="  Build React    : ${RED}ABSENT${NC}\n"
        ERRORS=$((ERRORS+1))
    fi

    HTTP_FRONT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null)
    if [ "$HTTP_FRONT" = "200" ]; then
        REPORT+="  Nginx frontend : ${GREEN}OK${NC} (HTTP 200)\n"
    else
        REPORT+="  Nginx frontend : ${YELLOW}HTTP $HTTP_FRONT${NC}\n"
        WARNINGS=$((WARNINGS+1))
    fi
    REPORT+="\n"

    # Test 5 : Configuration
    REPORT+="[CONFIGURATION]\n"
    REPORT+="  URL application       : $APP_URL\n"
    REPORT+="  REACT_APP_BACKEND_URL : $(cat $APP_DIR/frontend/.env 2>/dev/null | grep REACT_APP_BACKEND_URL | cut -d'=' -f2-)\n"
    REPORT+="  Repertoire            : $APP_DIR\n"
    REPORT+="  Utilisateur systeme   : $APP_USER\n"
    REPORT+="  Port backend          : $BACKEND_PORT\n"
    REPORT+="  Base de donnees       : $MONGO_DB_NAME\n"
    REPORT+="  Backup auto           : Quotidien 02:00\n"
    REPORT+="\n"

    # Test 6 : Acces
    REPORT+="[ACCES]\n"
    REPORT+="  Admin email    : $ADMIN_EMAIL\n"
    REPORT+="  Admin password : (celui fourni lors de l'installation)\n"
    REPORT+="\n"

    # Resume
    REPORT+="================================================================\n"
    if [ $ERRORS -eq 0 ]; then
        REPORT+="  RESULTAT : ${GREEN}${BOLD}INSTALLATION REUSSIE${NC} ($SERVICES_OK/$SERVICES_TOTAL services, $API_OK/$API_TOTAL APIs)\n"
    else
        REPORT+="  RESULTAT : ${RED}${BOLD}$ERRORS ERREUR(S)${NC} - Verifiez les points ci-dessus\n"
    fi
    if [ $WARNINGS -gt 0 ]; then
        REPORT+="  $WARNINGS avertissement(s) non bloquant(s)\n"
    fi
    REPORT+="================================================================\n"
    REPORT+="\n"
    REPORT+="[COMMANDES UTILES]\n"
    REPORT+="  Status backend       : sudo systemctl status prixrevient-backend\n"
    REPORT+="  Redemarrer backend   : sudo systemctl restart prixrevient-backend\n"
    REPORT+="  Logs backend         : sudo tail -f /var/log/prixrevient/backend-error.log\n"
    REPORT+="  Logs Nginx           : sudo tail -f /var/log/nginx/error.log\n"
    REPORT+="  Backup manuel        : sudo /opt/backups/backup_prixrevient.sh\n"
    REPORT+="  Mise a jour          : sudo bash $APP_DIR/update.sh /chemin/vers/prixrevient-deploy.zip\n"
    REPORT+="  Console MongoDB      : mongosh $MONGO_DB_NAME\n"
    REPORT+="\n"
    REPORT+="  Application accessible a : $APP_URL\n"

    # Afficher le rapport
    echo ""
    echo -e "$REPORT"

    # Sauvegarder le rapport (version sans couleurs)
    echo -e "$REPORT" | sed 's/\x1b\[[0-9;]*m//g' > "$REPORT_FILE"
    log_ok "Rapport sauvegarde dans $REPORT_FILE"
}

# ==================== MAIN ====================
main() {
    echo ""
    echo -e "${BOLD}${CYAN}=======================================================${NC}"
    echo -e "${BOLD}${CYAN}  PrixRevient - Installation Serveur Interne Ubuntu${NC}"
    echo -e "${BOLD}${CYAN}=======================================================${NC}"
    echo ""

    check_root
    check_ubuntu
    collect_info

    install_prerequisites
    install_nodejs
    install_mongodb
    create_app_user
    deploy_application
    configure_service
    configure_nginx
    configure_ssl
    setup_extras
    generate_report

    echo ""
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}Installation terminee avec succes !${NC}"
        echo -e "Ouvrez ${GREEN}$APP_URL${NC} dans votre navigateur."
    else
        echo -e "${RED}${BOLD}Installation terminee avec $ERRORS erreur(s).${NC}"
        echo -e "Consultez le rapport : $REPORT_FILE"
    fi
    echo ""
}

main "$@"
