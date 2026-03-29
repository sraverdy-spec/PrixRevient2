# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Creer une application pour calculer le prix de revient d'un produit en prenant des couts de main d'oeuvre et la recette de production de l'article.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) + PyMongo
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly)

## Fonctionnalites implementees

### Phase 1 - MVP (Complete)
- [x] Authentification (login/register/logout) avec session cookies
- [x] Tableau de bord avec statistiques et graphiques
- [x] CRUD Matieres premieres
- [x] CRUD Recettes de production
- [x] Calcul du prix de revient (matieres + main d'oeuvre + frais generaux)
- [x] Export PDF des recettes

### Phase 2 - Fonctionnalites avancees (Complete - 29 Mars 2026)
- [x] Freinte (pertes matieres) integree dans le calcul
- [x] Import CSV matieres premieres
- [x] Arbre de fabrication avec articles semi-finis
- [x] Marge commerciale et prix de vente conseille
- [x] CRUD Fournisseurs et Categories
- [x] Tableau des couts complet + Export Excel
- [x] Comparaison de recettes
- [x] Page BOM Tree
- [x] Menu repliable (sidebar collapse) avec icones visibles

### Phase 3 - Import automatique (Complete - 29 Mars 2026)
- [x] Import CSV arbre de fabrication (BOM) avec colonne sub_recipe
- [x] API REST pour import automatique (POST /api/import/auto)
- [x] Surveillance SFTP du dossier /backend/import_watch/
- [x] Centre d'Import avec 3 onglets (API, SFTP, Historique)
- [x] Documentation API integree dans le Centre d'Import
- [x] Historique des imports avec statut

## Endpoints API
- POST /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
- GET/POST /api/materials, GET/PUT/DELETE /api/materials/{id}
- POST /api/materials/import-csv, GET /api/materials/csv-template
- GET/POST /api/recipes, GET/PUT/DELETE /api/recipes/{id}
- GET /api/recipes/{id}/cost, GET /api/recipes/{id}/pdf
- GET /api/recipes/intermediate
- POST /api/recipes/import-csv, GET /api/recipes/csv-template
- POST /api/recipes/import-bom-csv, GET /api/recipes/bom-csv-template
- GET/POST /api/overheads, GET/PUT/DELETE /api/overheads/{id}
- GET/POST /api/suppliers, GET/PUT/DELETE /api/suppliers/{id}
- GET/POST /api/categories, GET/PUT/DELETE /api/categories/{id}
- GET /api/dashboard/stats, /api/costs/all, /api/costs/export
- POST /api/import/auto?import_type=materials|recipes|bom
- POST /api/import/sftp-scan
- GET /api/import/status

## Credentials
- Admin: admin@example.com / Admin123!

## Backlog / Taches futures
- P2: Module simulation (scenarios de cout)
- P2: Historique des prix et tendances
- P2: Gestion multi-utilisateurs
- P2: Notifications d'alerte stock
- P3: Cron job automatique pour SFTP scan periodique
