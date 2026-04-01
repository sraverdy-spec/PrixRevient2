# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Application pour calculer le prix de revient d'un produit avec BOM, freinte, main d'oeuvre, frais generaux. Ameliorations progressives: imports CSV/SFTP, RBAC, export Excel, configuration globale, unites, fournisseurs/versions, API KPI, SSO, simulation, multi-sites, code_article, code fournisseur, logs import DB, simulation live.

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

### Phase 8 - SSO + Simulation + Multi-sites (Complete)
- SSO Google/Microsoft OAuth2 (modules prets, activation via Parametres > SSO)
- Historique des prix, Alertes prix fournisseurs
- Simulation What-If: impact variation prix matiere sur recettes
- Gestion multi-sites (CRUD sites)

### Phase 9 - Code article, Code fournisseur, Logs import DB, Simulation live (Complete - 1 Avril 2026)
- [x] code_article sur Matieres premieres (backend + frontend: formulaire + tableau)
- [x] code sur Fournisseurs (backend + frontend: formulaire + tableau, sans delai/minimum)
- [x] Logs d'import migres vers MongoDB (/api/import/logs)
- [x] UI Historique des imports dans ImportCenter (onglet Historique avec actualisation)
- [x] Simulation live temporaire sur RecipeDetail (mode simulation, edition quantite/prix/freinte/MO, recalcul temps reel sans mutation DB, reinitialisation)

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Routes frontend
- / : Dashboard
- /materials : Matieres premieres (avec code_article)
- /recipes : Recettes (tableau par fournisseur)
- /recipes/:id : Detail recette (avec simulation live)
- /overheads : Frais generaux
- /suppliers : Fournisseurs (avec code)
- /categories : Categories
- /costs-table : Tableau des couts + Export Excel
- /comparison : Comparaison
- /bom : Arbre de fabrication
- /simulation : Simulation what-if
- /settings : Parametres (admin only, 8 onglets dont Import avec historique logs)

## DB Schema
- raw_materials: {..., code_article}
- suppliers: {..., code}
- import_logs: {filename, type, status, user, error_details, timestamp, result}
- recipes: {..., version, supplier_name}
- api_keys: {key, name, created_by, is_active}

## Deploiement
- Domaine: calculprix.appli-sciad.com
- ZIP: prixrevient-deploy.zip
- Mise a jour: wget ZIP + unzip -o + pip install -r + yarn build + systemctl restart

## Backlog
- P1: Logique backend SSO Google/Microsoft (activation reelle)
- P1: Logique backend Crontab (gestion taches planifiees)
- P2: Historique des couts - graphique evolution temporelle sur Dashboard
- P2: Alertes prix - notifications visuelles sur le Dashboard
- P2: Champ site_id sur recettes et matieres avec filtre par site
