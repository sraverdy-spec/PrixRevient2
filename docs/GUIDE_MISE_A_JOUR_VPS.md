# Guide de Mise a Jour - PrixRevient
## VPS Hostinger (calculprix.appli-sciad.com)

---

## Pre-requis

- Acces SSH root au serveur
- L'application est installee dans `/opt/prixrevient`
- Le ZIP de deploiement est disponible sur Emergent

---

## Procedure de Mise a Jour

### Etape 1 : Connexion au serveur

```bash
ssh root@calculprix.appli-sciad.com
```

### Etape 2 : Backup de securite (OBLIGATOIRE)

```bash
# Backup de la base de donnees
/opt/backups/backup_prixrevient.sh

# Backup du code actuel
cp -r /opt/prixrevient /opt/prixrevient_backup_$(date +%Y%m%d)
```

### Etape 3 : Telecharger la nouvelle version

```bash
cd /tmp

# Telecharger le ZIP depuis Emergent (remplacer l'URL par celle fournie)
wget -O prixrevient-deploy.zip "URL_DU_ZIP_EMERGENT"

# Extraire
unzip -o prixrevient-deploy.zip -d prixrevient-update
```

### Etape 4 : Mettre a jour le backend

```bash
# Arreter le service
sudo systemctl stop prixrevient-backend

# Copier les fichiers backend (SAUF le .env)
cp /tmp/prixrevient-update/backend/server.py /opt/prixrevient/backend/
cp /tmp/prixrevient-update/backend/requirements.txt /opt/prixrevient/backend/

# Installer les nouvelles dependances
cd /opt/prixrevient/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Etape 5 : Mettre a jour le frontend

```bash
# Copier les sources frontend
cp -r /tmp/prixrevient-update/frontend/src /opt/prixrevient/frontend/
cp /tmp/prixrevient-update/frontend/package.json /opt/prixrevient/frontend/

# Installer les dependances et builder
cd /opt/prixrevient/frontend
yarn install
yarn build
```

### Etape 6 : Redemarrer les services

```bash
# Redemarrer le backend
sudo systemctl start prixrevient-backend

# Redemarrer Nginx (si config modifiee)
sudo systemctl restart nginx
```

### Etape 7 : Verification

```bash
# Verifier que le backend tourne
sudo systemctl status prixrevient-backend

# Tester l'API
curl -s http://localhost:8001/api/auth/me
# Reponse attendue : {"detail":"Non authentifie"} (HTTP 401 = normal)

# Verifier les logs
sudo tail -20 /var/log/prixrevient/backend-error.log
```

### Etape 8 : Nettoyage

```bash
rm -rf /tmp/prixrevient-update /tmp/prixrevient-deploy.zip
```

---

## Script de Mise a Jour Rapide (tout-en-un)

Creez ce script sur votre serveur pour simplifier les mises a jour futures :

```bash
sudo nano /opt/prixrevient/update.sh
```

Contenu du script :

```bash
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
/opt/backups/backup_prixrevient.sh

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
    echo -e "${RED}Backend : ERREUR - verifier les logs${NC}"
    sudo journalctl -u prixrevient-backend --no-pager -n 20
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/auth/me)
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}API : OK (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}API : HTTP $HTTP_CODE - verifier les logs${NC}"
fi

rm -rf /tmp/prixrevient-update /tmp/prixrevient-deploy.zip
echo -e "${GREEN}Mise a jour terminee !${NC}"
```

Rendez-le executable :
```bash
chmod +x /opt/prixrevient/update.sh
```

Utilisation future :
```bash
sudo bash /opt/prixrevient/update.sh "https://URL_DU_ZIP"
```

---

## Rollback en cas de probleme

```bash
# Arreter le backend
sudo systemctl stop prixrevient-backend

# Restaurer le backup
cp -r /opt/prixrevient_backup_YYYYMMDD/* /opt/prixrevient/

# Redemarrer
sudo systemctl start prixrevient-backend
```

---

## Commandes Utiles

| Action | Commande |
|--------|----------|
| Status backend | `sudo systemctl status prixrevient-backend` |
| Redemarrer backend | `sudo systemctl restart prixrevient-backend` |
| Logs backend (temps reel) | `sudo journalctl -u prixrevient-backend -f` |
| Logs Nginx | `sudo tail -f /var/log/nginx/prixrevient-error.log` |
| Backup manuel | `sudo /opt/backups/backup_prixrevient.sh` |
| Renouveler SSL | `sudo certbot renew` |
| Status MongoDB | `sudo systemctl status mongod` |
| Console MongoDB | `mongosh cost_calculator` |

---

## Frequence recommandee

| Type | Frequence |
|------|-----------|
| Backup MongoDB | Automatique (quotidien 02:00) |
| Mise a jour applicative | A chaque livraison Emergent |
| Renouvellement SSL | Automatique (Certbot cron) |
| Mise a jour OS | Mensuelle (`apt update && apt upgrade`) |

---

# Installation sur serveur interne Ubuntu

Pour installer PrixRevient sur un nouveau serveur Ubuntu interne,
utilisez le script `install-interne.sh` inclus dans le ZIP de deploiement.

## Pre-requis serveur

- Ubuntu 20.04, 22.04 ou 24.04 LTS
- 2 Go RAM minimum
- 10 Go espace disque
- Acces root (sudo)
- Reseau interne accessible depuis les postes utilisateurs

## Procedure

```bash
# 1. Copier et extraire le ZIP sur le serveur
scp prixrevient-deploy.zip user@serveur:/tmp/
ssh user@serveur
cd /tmp && unzip prixrevient-deploy.zip -d prixrevient-install

# 2. Lancer l'installation
cd /tmp/prixrevient-install
sudo bash install-interne.sh
```

Le script pose les questions suivantes :
- **URL d'acces** : http://192.168.x.x ou https://calculprix.local
- **Email admin** : adresse email du compte administrateur
- **Mot de passe admin** : mot de passe initial
- **URL MongoDB** : laisser par defaut si MongoDB local

## Ce que le script installe automatiquement

1. Pre-requis (Python, build-essential)
2. Node.js 20 LTS + Yarn
3. MongoDB 7
4. Backend Python (venv + dependances)
5. Frontend React (build de production)
6. Service systemd (demarrage automatique)
7. Nginx (reverse proxy)
8. SSL Let's Encrypt (optionnel)
9. Backup automatique quotidien
10. Script de mise a jour

## Rapport de verification

A la fin de l'installation, un rapport complet est affiche et sauvegarde
dans `/opt/prixrevient/rapport_installation.txt`. Il verifie :

- Etat des services (MongoDB, Backend, Nginx)
- Reponses API (authentification, dashboard)
- Presence du build frontend
- Configuration (URL, base de donnees)

## Problemes connus et solutions

| Probleme | Solution |
|----------|----------|
| numpy/pandas incompatible | Le script ajuste automatiquement pour Python 3.10 |
| Network Error au login | Verifier REACT_APP_BACKEND_URL dans /opt/prixrevient/frontend/.env |
| Mot de passe admin incorrect | Reinitialiser via le script dans la doc |
| MongoDB ne demarre pas | Verifier /var/log/mongodb/mongod.log |
