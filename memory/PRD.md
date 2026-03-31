# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Application pour calculer le prix de revient d'un produit avec BOM, freinte, main d'oeuvre, frais generaux. Ameliorations: imports CSV/SFTP, RBAC, export Excel, configuration globale, unites, fournisseurs/versions, API KPI publique.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI (Python) + PyMongo + openpyxl
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly) + RBAC (admin, manager, operator)

## Fonctionnalites implementees

### Phase 1-4 (Complete)
- MVP: auth, dashboard, CRUD matieres/recettes/fournisseurs/categories, calcul prix, export PDF
- Avancees: freinte, import CSV, BOM, marge, export Excel
- Import auto: API REST + SFTP scan
- RBAC: 3 roles, protection API, sidebar filtre

### Phase 5 - Configuration globale (Complete)
- Parametres 7 onglets: Apparence, Utilisateurs, Import, Taches planifiees, Unites, API, SSO
- Themes couleurs, logo, sidebar/login dynamiques

### Phase 6 - Unites, Fournisseurs, Versions (Complete)
- CRUD Unites de mesure (10 par defaut)
- Fournisseur + version sur recettes
- Duplication avec version auto-incrementee
- Page Recettes en tableau groupe par fournisseur + filtres
- Comparaison avec version/fournisseur dans les libelles

### Phase 7 - Import CSV etendu + API KPI (Complete - 31 Mars 2026)
- [x] Import CSV fournisseurs (POST /api/suppliers/import-csv)
- [x] Import CSV categories (POST /api/categories/import-csv)
- [x] Templates CSV telechargeables pour fournisseurs et categories
- [x] Types fournisseurs/categories dans import auto + centre import
- [x] API KPI publique avec 5 endpoints securises par cle API
- [x] Documentation API integree (GET /api/public/kpi/doc)
- [x] Gestion des cles API dans Parametres (creer/revoquer/activer/desactiver)
- [x] Authentification par X-API-Key header ou ?api_key= query param

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## API KPI publique
- GET /api/public/kpi/doc → Documentation (public)
- GET /api/public/kpi/summary → Resume KPI global
- GET /api/public/kpi/costs → Couts detailles (?supplier=, ?version=)
- GET /api/public/kpi/materials → Matieres premieres
- GET /api/public/kpi/recipes → Recettes
- GET /api/public/kpi/suppliers → Fournisseurs
Auth: Header X-API-Key ou param ?api_key=

## Deploiement
- Domaine: calculprix.appli-sciad.com
- VPS: Hostinger Ubuntu 22.04
- Node 20 LTS requis
- install.sh automatise tout (Node, MongoDB, Python, Nginx, SSL)

## Backlog
- P1: SSO Google + Microsoft (bouton activation)
- P2: Module simulation de marges (what-if)
- P2: Alertes prix fournisseurs
- P2: Historique des couts et tendances
- P3: Export automatique planifie par email
- P3: Mode multi-entreprise
