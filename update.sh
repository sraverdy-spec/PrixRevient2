#!/bin/bash
#===============================================================================
# PrixRevient - Script de mise a jour
# Usage :
#   sudo bash update.sh https://url-du-zip/prixrevient-deploy.zip
#   sudo bash update.sh /chemin/local/prixrevient-deploy.zip
#===============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

APP_DIR="/opt/prixrevient"
BACKEND_PORT=8001
ZIP_SOURCE="$1"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo ""
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo -e "${BOLD}${CYAN}  PrixRevient - Mise a jour${NC}"
echo -e "${BOLD}${CYAN}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}${CYAN}=======================================================${NC}"
echo ""

# --- Verification parametres ---
if [ -z "$ZIP_SOURCE" ]; then
    echo -e "${YELLOW}Usage :${NC}"
    echo -e "  sudo bash update.sh ${GREEN}https://url/prixrevient-deploy.zip${NC}"
    echo -e "  sudo bash update.sh ${GREEN}/chemin/vers/prixrevient-deploy.zip${NC}"
    echo ""
    exit 1
fi

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit etre execute en root (sudo)${NC}"
    exit 1
fi

if [ ! -d "$APP_DIR/backend" ]; then
    echo -e "${RED}Application non trouvee dans $APP_DIR${NC}"
    echo -e "Avez-vous execute install-interne.sh d'abord ?"
    exit 1
fi

# ==================== ETAPE 1 : BACKUP ====================
echo -e "${BLUE}[1/7]${NC} Backup de la base de donnees..."
if [ -f /opt/backups/backup_prixrevient.sh ]; then
    /opt/backups/backup_prixrevient.sh 2>/dev/null && echo -e "  ${GREEN}Backup OK${NC}" || echo -e "  ${YELLOW}Backup ignore${NC}"
else
    echo -e "  ${YELLOW}Script de backup absent, ignore${NC}"
fi

# Sauvegarder les fichiers actuels
echo -e "${BLUE}[2/7]${NC} Sauvegarde des fichiers actuels..."
BACKUP_DIR="$APP_DIR/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp "$APP_DIR/backend/server.py" "$BACKUP_DIR/" 2>/dev/null || true
cp "$APP_DIR/backend/requirements.txt" "$BACKUP_DIR/" 2>/dev/null || true
cp "$APP_DIR/frontend/package.json" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "  ${GREEN}Sauvegarde dans $BACKUP_DIR${NC}"

# ==================== ETAPE 2 : TELECHARGEMENT ====================
echo -e "${BLUE}[3/7]${NC} Recuperation du ZIP..."
cd /tmp
rm -rf prixrevient-update prixrevient-deploy.zip

if [[ "$ZIP_SOURCE" == http* ]]; then
    wget -q --show-progress -O prixrevient-deploy.zip "$ZIP_SOURCE"
else
    if [ -f "$ZIP_SOURCE" ]; then
        cp "$ZIP_SOURCE" prixrevient-deploy.zip
    else
        echo -e "${RED}Fichier non trouve : $ZIP_SOURCE${NC}"
        exit 1
    fi
fi

mkdir -p prixrevient-update
unzip -qo prixrevient-deploy.zip -d prixrevient-update
echo -e "  ${GREEN}ZIP extrait${NC}"

# Verifier le contenu
if [ ! -f /tmp/prixrevient-update/backend/server.py ]; then
    echo -e "${RED}ZIP invalide : backend/server.py manquant${NC}"
    rm -rf prixrevient-update prixrevient-deploy.zip
    exit 1
fi

# ==================== ETAPE 3 : ARRET BACKEND ====================
echo -e "${BLUE}[4/7]${NC} Arret du backend..."
systemctl stop prixrevient-backend 2>/dev/null || true
sleep 2
echo -e "  ${GREEN}Backend arrete${NC}"

# ==================== ETAPE 4 : MISE A JOUR BACKEND ====================
echo -e "${BLUE}[5/7]${NC} Mise a jour du backend..."
cp /tmp/prixrevient-update/backend/server.py "$APP_DIR/backend/"
cp /tmp/prixrevient-update/backend/requirements.txt "$APP_DIR/backend/"

# Copier import_watch si present
if [ -d /tmp/prixrevient-update/backend/import_watch ]; then
    cp -r /tmp/prixrevient-update/backend/import_watch "$APP_DIR/backend/" 2>/dev/null || true
fi

cd "$APP_DIR/backend"

# Ajuster numpy/pandas pour Python < 3.11
PYTHON_MINOR=$("$APP_DIR/backend/venv/bin/python3" -c "import sys; print(sys.version_info.minor)" 2>/dev/null || echo "10")
if [ "$PYTHON_MINOR" -lt 11 ]; then
    echo -e "  Ajustement dependances pour Python 3.$PYTHON_MINOR..."
    sed -i 's/numpy==2\.[3-9]\.[0-9]*/numpy==2.2.6/' requirements.txt
    sed -i 's/numpy==2\.4\.[0-9]*/numpy==2.2.6/' requirements.txt
    sed -i 's/pandas==3\.[0-9]\.[0-9]*/pandas==2.2.3/' requirements.txt
fi

source "$APP_DIR/backend/venv/bin/activate"
pip install -q -r requirements.txt 2>&1 | tail -1
deactivate
echo -e "  ${GREEN}Backend mis a jour${NC}"

# ==================== ETAPE 5 : MISE A JOUR FRONTEND ====================
echo -e "${BLUE}[6/7]${NC} Mise a jour du frontend..."

# Copier les sources (SANS ecraser .env)
cp -r /tmp/prixrevient-update/frontend/src "$APP_DIR/frontend/"
cp /tmp/prixrevient-update/frontend/package.json "$APP_DIR/frontend/"
[ -f /tmp/prixrevient-update/frontend/tailwind.config.js ] && cp /tmp/prixrevient-update/frontend/tailwind.config.js "$APP_DIR/frontend/"
[ -f /tmp/prixrevient-update/frontend/jsconfig.json ] && cp /tmp/prixrevient-update/frontend/jsconfig.json "$APP_DIR/frontend/"
[ -f /tmp/prixrevient-update/frontend/public/index.html ] && cp /tmp/prixrevient-update/frontend/public/index.html "$APP_DIR/frontend/public/"

# Copier la documentation si presente
if [ -d /tmp/prixrevient-update/docs ]; then
    mkdir -p "$APP_DIR/docs"
    cp -r /tmp/prixrevient-update/docs/* "$APP_DIR/docs/" 2>/dev/null || true
    echo -e "  Documentation mise a jour"
fi

cd "$APP_DIR/frontend"
yarn install --silent 2>/dev/null
yarn build 2>/dev/null
echo -e "  ${GREEN}Frontend compile${NC}"

# Permissions
chown -R prixrevient:prixrevient "$APP_DIR" 2>/dev/null || true

# ==================== ETAPE 6 : REDEMARRAGE ====================
echo -e "${BLUE}[7/7]${NC} Redemarrage des services..."
systemctl start prixrevient-backend
sleep 4

# ==================== VERIFICATION ====================
echo ""
echo -e "${BOLD}--- Verification ---${NC}"
ERRORS=0

# Backend
if systemctl is-active --quiet prixrevient-backend; then
    echo -e "  Backend  : ${GREEN}ACTIF${NC}"
else
    echo -e "  Backend  : ${RED}INACTIF${NC}"
    journalctl -u prixrevient-backend --no-pager -n 10
    ERRORS=$((ERRORS+1))
fi

# API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  API      : ${GREEN}OK${NC} (HTTP $HTTP_CODE)"
else
    echo -e "  API      : ${RED}HTTP $HTTP_CODE${NC}"
    ERRORS=$((ERRORS+1))
fi

# Auth
HTTP_AUTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/auth/me 2>/dev/null)
if [ "$HTTP_AUTH" = "401" ]; then
    echo -e "  Auth     : ${GREEN}OK${NC}"
else
    echo -e "  Auth     : ${YELLOW}HTTP $HTTP_AUTH${NC}"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo -e "  Nginx    : ${GREEN}ACTIF${NC}"
    systemctl reload nginx 2>/dev/null || true
fi

# Frontend
FRONTEND_URL=$(cat "$APP_DIR/frontend/.env" 2>/dev/null | grep REACT_APP_BACKEND_URL | cut -d'=' -f2-)
echo -e "  URL      : ${GREEN}$FRONTEND_URL${NC}"

# Nettoyage
rm -rf /tmp/prixrevient-update /tmp/prixrevient-deploy.zip

# Garder max 10 backups de fichiers
ls -dt "$APP_DIR/backups"/*/ 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}Mise a jour terminee avec succes !${NC}"
else
    echo -e "${RED}${BOLD}Mise a jour terminee avec $ERRORS erreur(s).${NC}"
    echo -e "Consultez les logs : sudo journalctl -u prixrevient-backend -n 50"
    echo -e "Pour revenir en arriere : les fichiers sont sauvegardes dans $BACKUP_DIR"
fi
echo ""
