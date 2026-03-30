# Mode Operatoire - Installation PrixRevient sur Serveur Linux

## 1. Pre-requis serveur

| Element | Minimum | Recommande |
|---------|---------|------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 Go | 8 Go |
| Disque | 20 Go | 50 Go SSD |
| OS | Ubuntu 22.04 LTS | **Ubuntu 24.04 LTS** |

### OS supportes

| OS | Version | Support |
|---|---|---|
| **Ubuntu Server 24.04 LTS** | Jusqu'en 2029 | Recommande |
| **Ubuntu Server 22.04 LTS** | Jusqu'en 2027 | Stable |
| **Debian 12 (Bookworm)** | Stable | Leger |
| **Rocky Linux 9** | RHEL-based | Entreprise |

---

## 2. Installation automatique (recommande)

```bash
# 1. Copier le script install.sh sur le serveur
scp install.sh user@serveur:/tmp/

# 2. Se connecter au serveur
ssh user@serveur

# 3. Executer le script
sudo bash /tmp/install.sh
```

Le script installe automatiquement : Node.js 20, Python 3, MongoDB 7, Nginx, et configure les services systemd.

---

## 3. Installation manuelle pas-a-pas

### 3.1 Mise a jour systeme

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Rocky Linux
sudo dnf update -y
```

### 3.2 Node.js 20 LTS + Yarn

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# Rocky Linux
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g yarn

# Verification
node -v    # v20.x.x
yarn -v    # 1.22.x
```

### 3.3 Python 3.11+ et pip

```bash
# Ubuntu/Debian (Python 3 est pre-installe)
sudo apt install -y python3 python3-pip python3-venv

# Rocky Linux
sudo dnf install -y python3 python3-pip python3-devel

# Verification
python3 --version   # Python 3.11+
```

### 3.4 MongoDB 7

```bash
# === Ubuntu 24.04 ===
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# === Debian 12 ===
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

# === Rocky Linux 9 ===
cat << 'EOF' | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
sudo dnf install -y mongodb-org

# Demarrer et activer MongoDB (tous OS)
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod

# Verification
mongosh --eval "db.version()"   # 7.0.x
```

### 3.5 Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# Rocky Linux
sudo dnf install -y nginx

sudo systemctl enable nginx
```

---

## 4. Deploiement de l'application

### 4.1 Creer l'utilisateur systeme

```bash
sudo useradd --system --create-home --shell /bin/bash prixrevient
sudo mkdir -p /opt/prixrevient
sudo chown prixrevient:prixrevient /opt/prixrevient
```

### 4.2 Copier les fichiers de l'application

```bash
# Option A : Depuis un depot Git
sudo -u prixrevient git clone https://votre-repo.git /opt/prixrevient/src
sudo cp -r /opt/prixrevient/src/backend /opt/prixrevient/backend
sudo cp -r /opt/prixrevient/src/frontend /opt/prixrevient/frontend

# Option B : Depuis une archive
scp prixrevient.tar.gz user@serveur:/tmp/
sudo tar -xzf /tmp/prixrevient.tar.gz -C /opt/prixrevient/

# Option C : Depuis ce serveur Emergent (telecharger via "Save to Github" puis git clone)
```

### 4.3 Backend - Environnement Python

```bash
cd /opt/prixrevient/backend

# Creer l'environnement virtuel
sudo -u prixrevient python3 -m venv venv

# Activer et installer les dependances
sudo -u prixrevient bash -c "
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn uvicorn[standard]
"
```

### 4.4 Backend - Configuration .env

```bash
# Generer un secret JWT
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

sudo -u prixrevient cat > /opt/prixrevient/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=cost_calculator
JWT_SECRET=$JWT_SECRET
ADMIN_EMAIL=admin@votreentreprise.fr
ADMIN_PASSWORD=VotreMotDePasseSecurise!
EOF

# Proteger le fichier
sudo chmod 600 /opt/prixrevient/backend/.env
```

### 4.5 Frontend - Build de production

```bash
cd /opt/prixrevient/frontend

# Configurer l'URL du backend
echo "REACT_APP_BACKEND_URL=https://prixrevient.votredomaine.fr" > .env

# Installer les dependances et builder
sudo -u prixrevient yarn install
sudo -u prixrevient yarn build

# Le dossier build/ contient les fichiers statiques
ls build/    # index.html, static/, ...
```

---

## 5. Services systemd

### 5.1 Service Backend (FastAPI + Gunicorn)

```bash
sudo cat > /etc/systemd/system/prixrevient-backend.service << 'EOF'
[Unit]
Description=PrixRevient Backend (FastAPI)
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=prixrevient
Group=prixrevient
WorkingDirectory=/opt/prixrevient/backend
Environment=PATH=/opt/prixrevient/backend/venv/bin:/usr/bin:/bin
EnvironmentFile=/opt/prixrevient/backend/.env
ExecStart=/opt/prixrevient/backend/venv/bin/gunicorn server:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --bind 0.0.0.0:8001 \
    --timeout 120 \
    --access-logfile /var/log/prixrevient/backend-access.log \
    --error-logfile /var/log/prixrevient/backend-error.log
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Creer le dossier de logs
sudo mkdir -p /var/log/prixrevient
sudo chown prixrevient:prixrevient /var/log/prixrevient

# Activer et demarrer
sudo systemctl daemon-reload
sudo systemctl enable prixrevient-backend
sudo systemctl start prixrevient-backend

# Verifier
sudo systemctl status prixrevient-backend
```

### 5.2 Configuration Nginx (Reverse Proxy)

```bash
sudo cat > /etc/nginx/sites-available/prixrevient << 'EOF'
server {
    listen 80;
    server_name prixrevient.votredomaine.fr;
    # Note : HTTPS gere par votre equipe infra

    client_max_body_size 50M;

    access_log /var/log/nginx/prixrevient-access.log;
    error_log  /var/log/nginx/prixrevient-error.log;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    # Frontend (fichiers statiques React)
    location / {
        root /opt/prixrevient/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Activer et tester
sudo ln -sf /etc/nginx/sites-available/prixrevient /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Verification de l'installation

```bash
# Verifier tous les services
sudo systemctl status mongod
sudo systemctl status prixrevient-backend
sudo systemctl status nginx

# Tester l'API
curl http://localhost:8001/api/auth/me
# Attendu : {"detail":"Non authentifie"} (normal)

# Tester le login
curl -X POST http://localhost:8001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@votreentreprise.fr","password":"VotreMotDePasseSecurise!"}'
# Attendu : {"_id":"...","email":"...","name":"Admin","role":"admin"}

# Tester via Nginx
curl http://localhost/api/auth/me
```

---

## 7. Maintenance

### Commandes utiles

```bash
# Status des services
sudo systemctl status prixrevient-backend
sudo systemctl status mongod

# Redemarrer le backend (apres mise a jour)
sudo systemctl restart prixrevient-backend

# Voir les logs en temps reel
sudo journalctl -u prixrevient-backend -f
sudo tail -f /var/log/prixrevient/backend-error.log
sudo tail -f /var/log/nginx/prixrevient-error.log
```

### Mise a jour de l'application

```bash
# 1. Arreter le backend
sudo systemctl stop prixrevient-backend

# 2. Copier les nouveaux fichiers
cd /opt/prixrevient
sudo -u prixrevient git pull   # ou copier les fichiers manuellement

# 3. Mettre a jour les dependances backend
cd /opt/prixrevient/backend
sudo -u prixrevient bash -c "source venv/bin/activate && pip install -r requirements.txt"

# 4. Rebuilder le frontend
cd /opt/prixrevient/frontend
sudo -u prixrevient yarn install
sudo -u prixrevient yarn build

# 5. Redemarrer
sudo systemctl start prixrevient-backend
```

### Backup MongoDB

```bash
# Backup manuel
mongodump --db cost_calculator --out /opt/backups/prixrevient/dump_$(date +%Y%m%d)

# Restauration
mongorestore --db cost_calculator /opt/backups/prixrevient/dump_XXXXXXXX/cost_calculator/
```

### Backup automatique (cron)

```bash
# Editer le cron
sudo crontab -e

# Ajouter (backup quotidien a 02:00)
0 2 * * * mongodump --db cost_calculator --gzip --archive=/opt/backups/prixrevient/prixrevient_$(date +\%Y\%m\%d).gz && find /opt/backups/prixrevient/ -mtime +30 -delete
```

---

## 8. Securite en production

### Checklist securite

- [ ] Changer le mot de passe admin par defaut
- [ ] Configurer un mot de passe MongoDB (auth)
- [ ] Restreindre MongoDB a localhost uniquement (bind_ip: 127.0.0.1)
- [ ] HTTPS via votre infra (certificat SSL)
- [ ] Firewall : n'ouvrir que les ports 80/443
- [ ] Mettre a jour regulierement (apt upgrade)
- [ ] Configurer les backups automatiques
- [ ] Surveiller les logs

### Securiser MongoDB (authentification)

```bash
# Se connecter a MongoDB
mongosh

# Creer un utilisateur admin MongoDB
use admin
db.createUser({
    user: "prixrevient_admin",
    pwd: "MotDePasseMongoDB!",
    roles: [ { role: "readWrite", db: "cost_calculator" } ]
})
exit

# Activer l'authentification
sudo nano /etc/mongod.conf
# Ajouter :
# security:
#   authorization: enabled

sudo systemctl restart mongod

# Mettre a jour le .env du backend
# MONGO_URL=mongodb://prixrevient_admin:MotDePasseMongoDB!@localhost:27017/cost_calculator?authSource=admin
```

---

## 9. Architecture des fichiers

```
/opt/prixrevient/
├── backend/
│   ├── venv/                  # Environnement virtuel Python
│   ├── server.py              # Application FastAPI
│   ├── requirements.txt       # Dependances Python
│   ├── .env                   # Configuration (secrets)
│   └── import_watch/          # Dossier SFTP pour imports auto
│       └── processed/         # Fichiers traites
├── frontend/
│   ├── build/                 # Fichiers statiques React (production)
│   ├── src/                   # Code source React
│   └── package.json           # Dependances Node.js
│
/etc/systemd/system/
│   └── prixrevient-backend.service
/etc/nginx/sites-available/
│   └── prixrevient
/var/log/prixrevient/
│   ├── backend-access.log
│   ├── backend-error.log
│   └── backup.log
/opt/backups/prixrevient/
    └── prixrevient_YYYYMMDD.tar.gz
```

---

## 10. Depannage

| Probleme | Commande de diagnostic | Solution |
|----------|----------------------|----------|
| Backend ne demarre pas | `sudo journalctl -u prixrevient-backend -n 50` | Verifier .env, requirements |
| MongoDB refuse la connexion | `sudo systemctl status mongod` | Verifier bind_ip dans mongod.conf |
| Page blanche frontend | `ls /opt/prixrevient/frontend/build/` | Rebuilder : `yarn build` |
| Erreur 502 Nginx | `sudo tail /var/log/nginx/prixrevient-error.log` | Verifier que le backend tourne |
| Import CSV echoue | `sudo tail /var/log/prixrevient/backend-error.log` | Verifier format CSV et permissions |
