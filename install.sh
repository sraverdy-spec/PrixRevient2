#!/bin/bash
#===============================================================================
# PrixRevient - Script d'installation automatique
# Compatible : Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux 9
# Usage : sudo bash install.sh
#===============================================================================

set -e

# ==================== CONFIGURATION ====================
APP_NAME="prixrevient"
APP_DIR="/opt/$APP_NAME"
APP_USER="prixrevient"
MONGO_DB_NAME="cost_calculator"
BACKEND_PORT=8001
FRONTEND_PORT=3000
DOMAIN="calculprix.appli-sciad.com"  # Nom de domaine de production

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERREUR]${NC} $1"; }

# ==================== DETECTION OS ====================
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "OS non supporte"
        exit 1
    fi
    log_info "OS detecte : $OS $OS_VERSION"
}

# ==================== PRE-REQUIS ====================
install_prerequisites() {
    log_info "Installation des pre-requis systeme..."

    case $OS in
        ubuntu|debian)
            apt-get update -y
            apt-get install -y curl wget gnupg2 git build-essential software-properties-common \
                python3 python3-pip python3-venv nginx
            ;;
        rocky|centos|rhel)
            dnf update -y
            dnf install -y curl wget git gcc make python3 python3-pip python3-devel nginx
            ;;
        *)
            log_error "OS non supporte : $OS"
            exit 1
            ;;
    esac
    log_ok "Pre-requis systeme installes"
}

# ==================== NODE.JS 20 LTS ====================
install_nodejs() {
    REQUIRED_MAJOR=20

    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_MAJOR" -ge 22 ]; then
            log_warn "Node.js $NODE_VER detecte - version trop recente, incompatible avec ce projet"
            log_info "Desinstallation et reinstallation de Node.js 20 LTS..."
            case $OS in
                ubuntu|debian)
                    apt-get remove -y nodejs 2>/dev/null
                    rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null
                    ;;
                rocky|centos|rhel)
                    dnf remove -y nodejs 2>/dev/null
                    ;;
            esac
        elif [ "$NODE_MAJOR" -ge 16 ]; then
            log_ok "Node.js $NODE_VER compatible - pas de reinstallation"
            # S'assurer que Yarn est installe
            if ! command -v yarn &> /dev/null; then
                npm install -g yarn
            fi
            return
        else
            log_warn "Node.js $NODE_VER trop ancien, mise a jour vers Node 20..."
        fi
    fi

    log_info "Installation de Node.js 20 LTS..."

    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;
        rocky|centos|rhel)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            dnf install -y nodejs
            ;;
    esac

    # Installer Yarn
    npm install -g yarn

    log_ok "Node.js $(node -v) + Yarn $(yarn -v) installes"
}

# ==================== MONGODB 7 ====================
install_mongodb() {
    if command -v mongod &> /dev/null; then
        log_info "MongoDB deja installe"
        return
    fi

    log_info "Installation de MongoDB 7..."

    case $OS in
        ubuntu)
            curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
                gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
            echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
                tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            apt-get update
            apt-get install -y mongodb-org
            ;;
        debian)
            curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
                gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
            echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian $(lsb_release -cs)/mongodb-org/7.0 main" | \
                tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            apt-get update
            apt-get install -y mongodb-org
            ;;
        rocky|centos|rhel)
            cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'MONGOREPO'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
MONGOREPO
            dnf install -y mongodb-org
            ;;
    esac

    systemctl daemon-reload
    systemctl enable mongod
    systemctl start mongod
    sleep 3

    if systemctl is-active --quiet mongod; then
        log_ok "MongoDB installe et demarre"
    else
        log_error "MongoDB n'a pas demarre correctement"
        journalctl -u mongod --no-pager -n 20
        exit 1
    fi
}

# ==================== UTILISATEUR APPLICATION ====================
create_app_user() {
    if id "$APP_USER" &>/dev/null; then
        log_info "Utilisateur $APP_USER existe deja"
        return
    fi

    log_info "Creation de l'utilisateur systeme $APP_USER..."
    useradd --system --create-home --shell /bin/bash "$APP_USER"
    log_ok "Utilisateur $APP_USER cree"
}

# ==================== DEPLOIEMENT APPLICATION ====================
deploy_application() {
    log_info "Deploiement de l'application dans $APP_DIR..."

    mkdir -p "$APP_DIR"

    # Si le dossier contient deja l'app (mise a jour)
    if [ -d "$APP_DIR/backend" ]; then
        log_warn "Application existante detectee - mise a jour..."
    fi

    # ---- BACKEND ----
    log_info "Configuration du backend..."
    mkdir -p "$APP_DIR/backend"

    # Copier les fichiers backend (adapter selon votre methode de deploiement)
    # Option 1: Git clone
    # git clone https://votre-repo.git "$APP_DIR/src"
    # cp -r "$APP_DIR/src/backend/"* "$APP_DIR/backend/"

    # Option 2: Copie locale (si les fichiers sont deja sur le serveur)
    # cp -r /chemin/vers/backend/* "$APP_DIR/backend/"

    # Creer l'environnement virtuel Python
    cd "$APP_DIR/backend"
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate

    # Installer les dependances Python
    pip install --upgrade pip
    if [ -f requirements.txt ]; then
        pip install -r requirements.txt
    else
        log_warn "requirements.txt non trouve - installation manuelle..."
        pip install fastapi "uvicorn[standard]" gunicorn motor pymongo "pydantic[email]" \
            "python-jose[cryptography]" PyJWT "passlib[bcrypt]" python-multipart reportlab \
            python-dotenv aiofiles openpyxl
    fi

    # Verification que les modules critiques sont bien installes
    log_info "Verification des modules Python..."
    venv/bin/python -c "from jose import jwt; print('  jose/jwt: OK')"
    venv/bin/python -c "from passlib.context import CryptContext; print('  passlib: OK')"
    venv/bin/python -c "import motor; print('  motor: OK')"
    venv/bin/python -c "import fastapi; print('  fastapi: OK')"
    venv/bin/python -c "import openpyxl; print('  openpyxl: OK')"

    deactivate

    # Creer le fichier .env backend
    if [ ! -f "$APP_DIR/backend/.env" ]; then
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        cat > "$APP_DIR/backend/.env" << ENVFILE
MONGO_URL=mongodb://localhost:27017
DB_NAME=$MONGO_DB_NAME
JWT_SECRET=$JWT_SECRET
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!
ENVFILE
        log_ok "Fichier .env backend cree (pensez a changer le mot de passe admin !)"
    fi

    # Creer le dossier d'import SFTP
    mkdir -p "$APP_DIR/backend/import_watch/processed"

    # ---- FRONTEND ----
    log_info "Configuration du frontend..."
    mkdir -p "$APP_DIR/frontend"

    cd "$APP_DIR/frontend"

    # Installer les dependances et builder
    if [ -f package.json ]; then
        yarn install --frozen-lockfile 2>/dev/null || yarn install
        
        # Creer le .env frontend pour le build
        BACKEND_URL="http://localhost"
        if [ -n "$DOMAIN" ]; then
            BACKEND_URL="https://$DOMAIN"
        fi
        echo "REACT_APP_BACKEND_URL=$BACKEND_URL" > .env
        
        yarn build
        log_ok "Frontend build termine"
    else
        log_warn "package.json non trouve dans frontend/"
    fi

    # Permissions
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    log_ok "Application deployee dans $APP_DIR"
}

# ==================== SERVICE SYSTEMD - BACKEND ====================
create_backend_service() {
    log_info "Creation du service systemd backend..."

    cat > /etc/systemd/system/prixrevient-backend.service << SERVICE
[Unit]
Description=PrixRevient Backend (FastAPI)
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin:/usr/bin:/bin
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn server:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --bind 0.0.0.0:$BACKEND_PORT \
    --timeout 120 \
    --access-logfile /var/log/prixrevient/backend-access.log \
    --error-logfile /var/log/prixrevient/backend-error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

    mkdir -p /var/log/prixrevient
    chown -R "$APP_USER:$APP_USER" /var/log/prixrevient

    systemctl daemon-reload
    systemctl enable prixrevient-backend
    systemctl start prixrevient-backend
    sleep 3

    if systemctl is-active --quiet prixrevient-backend; then
        log_ok "Service backend demarre sur le port $BACKEND_PORT"
    else
        log_error "Le backend n'a pas demarre"
        journalctl -u prixrevient-backend --no-pager -n 20
    fi
}

# ==================== NGINX REVERSE PROXY ====================
configure_nginx() {
    log_info "Configuration de Nginx..."

    SERVER_NAME="_"
    if [ -n "$DOMAIN" ]; then
        SERVER_NAME="$DOMAIN"
    fi

    cat > /etc/nginx/sites-available/prixrevient << NGINX
server {
    listen 80;
    server_name $SERVER_NAME;

    # Logs
    access_log /var/log/nginx/prixrevient-access.log;
    error_log  /var/log/nginx/prixrevient-error.log;

    # Taille max upload (pour les imports CSV)
    client_max_body_size 50M;

    # Backend API - toutes les routes /api/*
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    # Frontend - fichiers statiques du build React
    location / {
        root $APP_DIR/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache des assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX

    # Activer le site
    ln -sf /etc/nginx/sites-available/prixrevient /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null

    # Tester la config Nginx
    if nginx -t 2>/dev/null; then
        systemctl enable nginx
        systemctl restart nginx
        log_ok "Nginx configure et demarre"
    else
        log_error "Erreur dans la configuration Nginx"
        nginx -t
    fi
}

# ==================== SSL / LET'S ENCRYPT ====================
setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        log_warn "Pas de domaine configure - SSL ignore"
        return
    fi

    log_info "Installation de Certbot pour SSL (Let's Encrypt)..."

    case $OS in
        ubuntu|debian)
            apt-get install -y certbot python3-certbot-nginx
            ;;
        rocky|centos|rhel)
            dnf install -y certbot python3-certbot-nginx
            ;;
    esac

    log_info "Obtention du certificat SSL pour $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>/dev/null || {
        log_warn "Certbot automatique echoue. Lancez manuellement :"
        log_warn "  sudo certbot --nginx -d $DOMAIN"
        return
    }

    log_ok "SSL configure pour https://$DOMAIN"
}

# ==================== SCRIPT DE BACKUP MONGODB ====================
create_backup_script() {
    log_info "Creation du script de backup MongoDB..."

    mkdir -p /opt/backups/prixrevient

    cat > /opt/backups/backup_prixrevient.sh << 'BACKUP'
#!/bin/bash
# Backup MongoDB - PrixRevient
BACKUP_DIR="/opt/backups/prixrevient"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mongodump --db cost_calculator --out "$BACKUP_DIR/dump_$DATE"
tar -czf "$BACKUP_DIR/prixrevient_$DATE.tar.gz" -C "$BACKUP_DIR" "dump_$DATE"
rm -rf "$BACKUP_DIR/dump_$DATE"

# Nettoyage des vieux backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup termine : prixrevient_$DATE.tar.gz"
BACKUP

    chmod +x /opt/backups/backup_prixrevient.sh

    # Ajouter un cron pour backup quotidien a 2h du matin
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/backup_prixrevient.sh >> /var/log/prixrevient/backup.log 2>&1") | crontab -

    log_ok "Backup automatique configure (quotidien a 02:00)"
}

# ==================== VERIFICATION FINALE ====================
verify_installation() {
    echo ""
    echo "=============================================="
    echo "  VERIFICATION DE L'INSTALLATION"
    echo "=============================================="
    echo ""

    # MongoDB
    if systemctl is-active --quiet mongod; then
        log_ok "MongoDB         : actif"
    else
        log_error "MongoDB         : inactif"
    fi

    # Backend
    if systemctl is-active --quiet prixrevient-backend; then
        log_ok "Backend FastAPI  : actif (port $BACKEND_PORT)"
    else
        log_error "Backend FastAPI  : inactif"
    fi

    # Nginx
    if systemctl is-active --quiet nginx; then
        log_ok "Nginx           : actif (port 80)"
    else
        log_error "Nginx           : inactif"
    fi

    # Test API
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/auth/me 2>/dev/null)
    if [ "$HTTP_CODE" == "401" ]; then
        log_ok "API Backend     : repond (HTTP $HTTP_CODE - normal sans auth)"
    else
        log_warn "API Backend     : HTTP $HTTP_CODE"
    fi

    echo ""
    echo "=============================================="
    echo "  INSTALLATION TERMINEE"
    echo "=============================================="
    echo ""
    echo "  Application    : https://$DOMAIN"
    echo "  API            : https://$DOMAIN/api"
    echo "  MongoDB        : mongodb://localhost:27017/$MONGO_DB_NAME"
    echo ""
    echo "  Compte admin   : admin@example.com / Admin123!"
    echo "  (CHANGEZ CE MOT DE PASSE en production !)"
    echo ""
    echo "  Fichiers app   : $APP_DIR"
    echo "  Logs           : /var/log/prixrevient/"
    echo "  Backups        : /opt/backups/prixrevient/"
    echo "  Import SFTP    : $APP_DIR/backend/import_watch/"
    echo ""
    echo "  Commandes utiles :"
    echo "    sudo systemctl status prixrevient-backend"
    echo "    sudo systemctl restart prixrevient-backend"
    echo "    sudo journalctl -u prixrevient-backend -f"
    echo "    sudo tail -f /var/log/prixrevient/backend-error.log"
    echo "    sudo /opt/backups/backup_prixrevient.sh"
    echo ""
}

# ==================== EXECUTION ====================
main() {
    echo ""
    echo "=============================================="
    echo "  INSTALLATION PrixRevient"
    echo "  Calculateur de Prix de Revient"
    echo "=============================================="
    echo ""

    if [ "$EUID" -ne 0 ]; then
        log_error "Ce script doit etre execute en root (sudo bash install.sh)"
        exit 1
    fi

    detect_os
    install_prerequisites
    install_nodejs
    install_mongodb
    create_app_user
    deploy_application
    create_backend_service
    configure_nginx
    setup_ssl
    create_backup_script
    verify_installation
}

main "$@"
