# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Application pour calculer le prix de revient d'un produit avec BOM, freinte, main d'oeuvre, frais generaux. Ameliorations progressives: imports CSV/SFTP, RBAC, export Excel, configuration globale, unites, fournisseurs/versions, API KPI, SSO, simulation, multi-sites, code_article, code fournisseur, logs import DB, simulation live, scheduler integre, dashboard evolution prix.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI (Python) + PyMongo + openpyxl + httpx (OAuth) + APScheduler
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

### Phase 9 - Code article, Logs import, Simulation live (Complete - 1 Avril 2026)
- code_article sur Matieres premieres (backend + frontend)
- code sur Fournisseurs (backend + frontend, sans delai/minimum)
- Logs d'import migres vers MongoDB avec UI Historique
- Simulation live temporaire sur RecipeDetail

### Phase 10 - Scheduler integre (Complete - 1 Avril 2026)
- APScheduler integre au backend (BackgroundScheduler)
- Execution automatique: sftp_scan + price_history
- sync_scheduler() + /api/scheduler/status
- last_status/last_result affiches avec badges couleur

### Phase 11 - Dashboard evolution prix + alertes (Complete - 1 Avril 2026)
- Graphique LineChart evolution des prix de revient sur 90 jours
- Donnees groupees par date, une ligne par recette
- Panneau alertes prix matieres (hausse/baisse avec pourcentage)
- Integration avec /api/price-history et /api/price-history/alerts

### Phase 12 - Documentation technique (Complete - 1 Avril 2026)
- MODELE_DONNEES.md : schema complet des 14 collections MongoDB
- Generation PDF et DOCX via generate_docs.py
- 3 documents disponibles : Guide VPS, Documentation Metier, Modele de Donnees

### Phase 13 - Tableau de bord Administration (Complete - 1 Avril 2026)
- Endpoint /api/dashboard/admin-stats (admin only)
- Section "Administration" dans Dashboard visible uniquement pour admins
- 4 KPIs: Utilisateurs (par role), Imports (succes/erreur), Sites, Alertes stock
- 3 panneaux: Recettes par categorie (BarChart), Derniers imports, Taches planifiees

### Phase 14 - Jeu de donnees et console DB (Complete - 1 Avril 2026)
- Endpoint /api/data/seed : 8 categories, 6 fournisseurs, 18 matieres, 7 recettes (2 sous-recettes), 5 frais, 6 unites
- Endpoint /api/data/reset : reinitialise toutes les collections (garde users + settings)
- Endpoint /api/data/query : console MongoDB (find, count, aggregate, distinct)
- Nouvel onglet "Base de donnees" dans Parametres avec seed, reset, console requetes

### Phase 15 - Renommage Clients + Types produit + Simulation versionnee + Photos (Complete - 2 Avril 2026)
- Renommage "Fournisseurs" en "Clients" partout (frontend + seed)
- Types produit (MDD, MN, SM, MP) sur recettes avec filtres
- Simulation versionnee (sauvegarde/chargement)
- Semi-finis editables dans la simulation
- Photos recettes avec dimensions configurables (120x120 par defaut)
- Correction bug texte blanc sur fond blanc pour anciennes recettes

### Phase 16 - code_article sur Recettes + Mise a jour docs (Complete - 2 Avril 2026)
- Ajout champ `code_article` au modele Recipe (RecipeBase, RecipeUpdate)
- Auto-generation codes REC-001, REC-002... a la creation
- Migration automatique au demarrage pour recettes existantes sans code
- Codes seed: REC-001 (Pate brisee) a REC-007 (Financier aux amandes)
- Affichage code_article sur 3 pages: Arbre BOM, Recettes, Tableau des couts
- Recherche par code_article dans Recettes et Tableau des couts
- code_article inclus dans /api/reports/all-costs
- Mise a jour MODELE_DONNEES.md : code_article + product_type recettes, renommage Clients, settings photo, AllCosts
- Mise a jour DOCUMENTATION_METIER.md : section Administration, types produit, code article, simulation versionnee, photos
- Regeneration PDF et DOCX pour les 3 documents
- ZIP de deploiement mis a jour

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Routes frontend
- / : Dashboard (avec evolution prix + alertes + admin)
- /materials : Matieres premieres (avec code_article)
- /recipes : Recettes (avec code_article, tableau par client)
- /recipes/:id : Detail recette (avec simulation live + photos)
- /overheads : Frais generaux
- /suppliers : Clients (avec code)
- /categories : Categories
- /costs-table : Tableau des couts (avec code_article) + Export Excel
- /comparison : Comparaison
- /bom : Arbre de fabrication (avec code_article recettes + matieres)
- /simulation : Simulation what-if
- /settings : Parametres (admin only, 9 onglets dont Base de donnees)

## DB Schema
- raw_materials: {..., code_article}
- recipes: {..., code_article, version, supplier_name, product_type}
- suppliers: {..., code}
- import_logs: {filename, type, status, user, error_details, timestamp, result}
- api_keys: {key, name, created_by, is_active}
- crontabs: {id, name, type, schedule, enabled, last_run, last_result, last_status, created_at}
- price_history: {id, recipe_id, recipe_name, supplier_name, version, cost_per_unit, total_cost, recorded_at}
- price_history_materials: {id, material_id, material_name, unit_price, supplier_name, recorded_at}
- settings: {..., recipe_photo_width, recipe_photo_height}

## Backlog
- P2: Champ site_id sur recettes et matieres avec filtre par site
