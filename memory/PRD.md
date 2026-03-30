# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Creer une application pour calculer le prix de revient d'un produit en prenant en compte les couts de main d'oeuvre, la recette de production (BOM/arbre de fabrication), la freinte (shrinkage) des matieres premieres, et les frais generaux. Ameliorations: imports automatiques (CSV/SFTP), gestion des droits (RBAC), export Excel, panneau de configuration global, parametrage des unites, fournisseurs sur recettes, duplication avec versions.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI (Python) + PyMongo + openpyxl
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly) + RBAC (3 roles: admin, manager, operator)

## Fonctionnalites implementees

### Phase 1 - MVP (Complete)
- [x] Authentification (login/logout) avec session cookies
- [x] Tableau de bord avec statistiques et graphiques
- [x] CRUD Matieres premieres
- [x] CRUD Recettes de production
- [x] Calcul du prix de revient (matieres + main d'oeuvre + frais generaux)
- [x] Export PDF des recettes

### Phase 2 - Fonctionnalites avancees (Complete)
- [x] Freinte (pertes matieres) integree dans le calcul
- [x] Import CSV matieres premieres
- [x] Arbre de fabrication avec articles semi-finis
- [x] Marge commerciale et prix de vente conseille
- [x] CRUD Fournisseurs et Categories
- [x] Tableau des couts complet + Export Excel (.xlsx)
- [x] Comparaison de recettes
- [x] Page BOM Tree + Import CSV arbre de fabrication
- [x] Menu repliable (sidebar collapse) avec icones visibles

### Phase 3 - Import automatique (Complete)
- [x] Import CSV arbre de fabrication (BOM)
- [x] API REST pour import automatique
- [x] Surveillance SFTP du dossier
- [x] Centre d'Import avec 3 onglets (API, SFTP, Historique)

### Phase 4 - Gestion des droits (Complete)
- [x] 3 roles : Admin, Manager, Operateur
- [x] Page de gestion des utilisateurs (admin only)
- [x] Protection API par role (403 si insuffisant)
- [x] Menu sidebar filtre par role

### Phase 5 - Configuration globale (Complete - 30 Mars 2026)
- [x] Page Parametres avec 6 onglets: Apparence, Utilisateurs, Import, Taches planifiees, Unites, SSO
- [x] Themes de couleurs predifinis + couleurs personnalisees
- [x] Upload/suppression de logo
- [x] Sidebar et login dynamiques avec couleurs configurables
- [x] Gestion des utilisateurs et Centre d'import integres dans Parametres

### Phase 6 - Unites, Fournisseurs et Versions (Complete - 30 Mars 2026)
- [x] CRUD Unites de mesure dans Parametres (auto-seed 10 unites par defaut)
- [x] Selecteur d'unites dynamique dans les recettes
- [x] Champ fournisseur (supplier_id, supplier_name) sur les recettes
- [x] Champ version sur les recettes
- [x] Duplication de recette avec increment automatique de version
- [x] Page Recettes refaite en tableau groupe par fournisseur
- [x] Filtres sur la page Recettes: recherche, fournisseur, version
- [x] Colonne Fournisseur et Version dans le Tableau des couts
- [x] Export Excel mis a jour avec Fournisseur et Version
- [x] Tuiles du dashboard avec degrades colores

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Routes frontend
- / : Dashboard
- /materials : Matieres premieres
- /recipes : Recettes (tableau groupe par fournisseur)
- /recipes/:id : Detail recette
- /overheads : Frais generaux
- /suppliers : Fournisseurs
- /categories : Categories
- /costs-table : Tableau des couts + Export Excel
- /comparison : Comparaison
- /bom : Arbre de fabrication
- /settings : Parametres (admin only, 6 onglets)

## API endpoints cles
- /api/units (GET/POST) - Unites de mesure
- /api/units/{id} (PUT/DELETE) - CRUD unite
- /api/recipes/{id}/duplicate (POST) - Dupliquer avec version++
- /api/settings (GET/PUT) - Configuration
- /api/reports/export-excel (GET) - Export Excel
- /api/reports/all-costs (GET) - Tous les couts (avec fournisseur/version)

## Backlog / Taches futures
- P1: SSO backend (implementation reelle)
- P1: Crontab execution automatique (scheduling reel)
- P2: Module simulation de marges (scenarios what-if)
- P2: Historique des prix et tendances
- P3: Notifications d'alerte stock
