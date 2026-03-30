# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Creer une application pour calculer le prix de revient d'un produit en prenant en compte les couts de main d'oeuvre, la recette de production (BOM/arbre de fabrication), la freinte (shrinkage) des matieres premieres, et les frais generaux. L'utilisateur a demande des ameliorations: imports automatiques (CSV/SFTP), gestion des droits utilisateurs (RBAC), export Excel complet, et un panneau de configuration global (couleurs, logos, integration des menus utilisateurs et imports).

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI (Python) + PyMongo + openpyxl
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly) + RBAC (3 roles: admin, manager, operator)

## Fonctionnalites implementees

### Phase 1 - MVP (Complete)
- [x] Authentification (login/logout) avec session cookies
- [x] Tableau de bord avec statistiques et graphiques (bar, pie, area charts)
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
- [x] Tableau des couts complet + Export Excel (.xlsx via openpyxl)
- [x] Comparaison de recettes
- [x] Page BOM Tree + Import CSV arbre de fabrication
- [x] Menu repliable (sidebar collapse) avec icones visibles

### Phase 3 - Import automatique (Complete)
- [x] Import CSV arbre de fabrication (BOM)
- [x] API REST pour import automatique
- [x] Surveillance SFTP du dossier
- [x] Centre d'Import avec 3 onglets (API, SFTP, Historique)

### Phase 4 - Gestion des droits (Complete)
- [x] 3 roles : Admin (acces total), Manager (creer/modifier), Operateur (consultation)
- [x] Page de gestion des utilisateurs (admin only)
- [x] Creation de comptes par l'admin uniquement
- [x] Modification role, desactivation/reactivation, changement mot de passe
- [x] Protection API par role (403 si insuffisant)
- [x] Menu sidebar filtre par role
- [x] Badge de role visible dans le sidebar

### Phase 5 - Configuration globale (Complete - 30 Mars 2026)
- [x] Page Parametres avec 5 onglets: Apparence, Utilisateurs, Import, Taches planifiees, SSO
- [x] Themes de couleurs predifinis (6 themes) + couleurs personnalisees
- [x] Upload/suppression de logo
- [x] Nom de societe configurable
- [x] Apercu en temps reel des couleurs
- [x] Sidebar dynamique avec couleurs configurables
- [x] Gestion des utilisateurs integree dans Parametres
- [x] Centre d'import integre dans Parametres
- [x] Gestion des taches planifiees (CRUD crontabs)
- [x] Configuration SSO (UI toggle + provider/client_id/domain)
- [x] Export Excel (.xlsx) dans le tableau des couts
- [x] Dashboard ameliore avec graphiques colores

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Routes frontend
- / : Dashboard
- /materials : Matieres premieres
- /recipes : Recettes
- /recipes/:id : Detail recette
- /overheads : Frais generaux
- /suppliers : Fournisseurs
- /categories : Categories
- /costs-table : Tableau des couts + Export Excel
- /comparison : Comparaison
- /bom : Arbre de fabrication
- /settings : Parametres (admin only)

## API endpoints cles
- /api/settings (GET/PUT) - Configuration de l'application
- /api/settings/logo (POST/DELETE) - Upload/suppression logo
- /api/crontabs (GET/POST) - Taches planifiees
- /api/crontabs/{id} (PUT/DELETE) - CRUD tache
- /api/crontabs/{id}/run (POST) - Execution manuelle
- /api/reports/export-excel (GET) - Export Excel
- /api/reports/all-costs (GET) - Tous les couts
- /api/dashboard/stats (GET) - Statistiques dashboard

## Backlog / Taches futures
- P1: SSO backend (implementation reelle, actuellement juste toggle UI)
- P1: Crontab execution automatique (actuellement juste CRUD sans scheduling reel)
- P2: Module simulation de marges (scenarios what-if)
- P2: Historique des prix et tendances
- P3: Notifications d'alerte stock
