#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/prixrevient"
ZIP_URL="$1"

if [ -z "$ZIP_URL" ]; then
    echo -e "${RED}Usage: sudo bash update.sh URL_DU_ZIP${NC}"
    exit 1
fi

echo -e "${BLUE}[1/7] Backup de la base de donnees...${NC}"
mongodump --db cost_calculator --out /opt/backups/mongo_$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "Backup ignore"

echo -e "${BLUE}[2/7] Telechargement de la mise a jour...${NC}"
cd /tmp
rm -rf prixrevient-update prixrevient-deploy.zip
wget -q -O prixrevient-deploy.zip "$ZIP_URL"
unzip -qo prixrevient-deploy.zip -d prixrevient-update

echo -e "${BLUE}[3/7] Arret du backend...${NC}"
sudo systemctl stop prixrevient-backend

echo -e "${BLUE}[4/7] Mise a jour du backend...${NC}"
cp /tmp/prixrevient-update/backend/server.py $APP_DIR/backend/
cp /tmp/prixrevient-update/backend/requirements.txt $APP_DIR/backend/
cd $APP_DIR/backend
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

echo -e "${BLUE}[5/7] Mise a jour du frontend...${NC}"
cp -r /tmp/prixrevient-update/frontend/src $APP_DIR/frontend/
cp /tmp/prixrevient-update/frontend/package.json $APP_DIR/frontend/
# Ne PAS ecraser le .env local
cd $APP_DIR/frontend
yarn install --silent
yarn build

echo -e "${BLUE}[6/7] Redemarrage des services...${NC}"
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
    echo -e "${GREEN}API : OK${NC}"
else
    echo -e "${RED}API : HTTP $HTTP_CODE${NC}"
fi

rm -rf /tmp/prixrevient-update /tmp/prixrevient-deploy.zip
echo -e "${GREEN}Mise a jour terminee !${NC}"
