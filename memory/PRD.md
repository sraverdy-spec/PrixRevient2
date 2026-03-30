# PRD - Calculateur de Prix de Revient (PrixRevient)

## Probleme original
Creer une application pour calculer le prix de revient d'un produit en prenant des couts de main d'oeuvre et la recette de production de l'article.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) + PyMongo
- **Database**: MongoDB
- **Auth**: Session cookies (httpOnly) + RBAC (3 roles)

## Fonctionnalites implementees

### Phase 1 - MVP (Complete)
- [x] Authentification (login/logout) avec session cookies
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
- [x] Page BOM Tree + Import CSV arbre de fabrication
- [x] Menu repliable (sidebar collapse) avec icones visibles

### Phase 3 - Import automatique (Complete - 29 Mars 2026)
- [x] Import CSV arbre de fabrication (BOM)
- [x] API REST pour import automatique
- [x] Surveillance SFTP du dossier
- [x] Centre d'Import avec 3 onglets (API, SFTP, Historique)

### Phase 4 - Gestion des droits (Complete - 29 Mars 2026)
- [x] 3 roles : Admin (acces total), Manager (creer/modifier), Operateur (consultation)
- [x] Page de gestion des utilisateurs (admin only)
- [x] Creation de comptes par l'admin uniquement (inscription libre desactivee)
- [x] Modification role, desactivation/reactivation, changement mot de passe
- [x] Protection API par role (403 si insuffisant)
- [x] Menu sidebar filtre par role
- [x] Boutons edition/suppression masques pour operateurs
- [x] Badge de role visible dans le sidebar

## Credentials
- Admin: admin@example.com / Admin123!
- Manager: manager@example.com / Manager123!
- Operateur: operator@example.com / Operator123!

## Backlog / Taches futures
- P1: SSO (Single Sign-On) - prevu dans un second temps
- P2: Module simulation (scenarios de cout)
- P2: Historique des prix et tendances
- P2: Cron job automatique pour SFTP scan
- P3: Notifications d'alerte stock
