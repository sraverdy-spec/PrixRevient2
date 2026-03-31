# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Application pour calculer le prix de revient d'un produit avec BOM, freinte, main d'oeuvre, frais generaux. Ameliorations progressives: imports CSV/SFTP, RBAC, export Excel, configuration globale, unites, fournisseurs/versions, API KPI, SSO, simulation, multi-sites.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI (Python) + PyMongo + openpyxl + httpx (OAuth)
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly) + RBAC (admin, manager, operator) + SSO OAuth2 (pret)
- **Deploiement**: VPS Hostinger Ubuntu 22.04 (calculprix.appli-sciad.com)

## Fonctionnalites implementees

### Phase 1-4 (Complete)
- MVP: auth, dashboard, CRUD matieres/recettes/fournisseurs/categories, calcul prix, export PDF
- Avancees: freinte, import CSV, BOM, marge, export Excel
- Import auto: API REST + SFTP scan
- RBAC: 3 roles, protection API, sidebar filtre

### Phase 5 - Configuration globale (Complete)
- Parametres 8 onglets: Apparence, Utilisateurs, Import, Taches planifiees, Unites, API, Sites, SSO
- Themes couleurs, logo, sidebar/login dynamiques

### Phase 6 - Unites, Fournisseurs, Versions (Complete)
- CRUD Unites, fournisseur+version sur recettes, duplication auto
- Page Recettes en tableau groupe par fournisseur + filtres

### Phase 7 - Import CSV etendu + API KPI (Complete)
- Import CSV fournisseurs + categories
- API KPI publique (5 endpoints) avec gestion cles API

### Phase 8 - SSO + Simulation + Multi-sites (Complete - 31 Mars 2026)
- [x] SSO Google OAuth2 (module pret, activation via Parametres > SSO)
- [x] SSO Microsoft Azure AD (module pret, activation via Parametres > SSO)
- [x] Boutons SSO conditionnels sur la page login
- [x] Endpoint /api/auth/sso/status pour detecter SSO disponible
- [x] Historique des prix (enregistrement recettes + matieres)
- [x] Alertes prix fournisseurs (seuil configurable)
- [x] Simulation What-If : impact variation prix matiere sur recettes
- [x] Page Simulation avec selecteur matiere, presets %, tableau impacts
- [x] Gestion multi-sites (CRUD sites, site par defaut auto-seed)

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Routes frontend
- / : Dashboard
- /materials : Matieres premieres
- /recipes : Recettes (tableau par fournisseur)
- /recipes/:id : Detail recette
- /overheads : Frais generaux
- /suppliers : Fournisseurs
- /categories : Categories
- /costs-table : Tableau des couts + Export Excel
- /comparison : Comparaison
- /bom : Arbre de fabrication
- /simulation : Simulation what-if
- /settings : Parametres (admin only, 8 onglets)

## Deploiement
- Domaine: calculprix.appli-sciad.com
- ZIP: https://cost-calculator-113.preview.emergentagent.com/prixrevient-deploy.zip
- Mise a jour: wget ZIP + unzip -o + pip install -r + yarn build + systemctl restart

## Backlog
- P2 : Historique des couts - graphique evolution temporelle sur Dashboard
- P2 : Alertes prix - notifications visuelles sur le Dashboard
- P2 : Champ site_id sur recettes et matieres avec filtre par site
- P3 : Export automatique planifie par email
- P3 : Application mobile (PWA)
