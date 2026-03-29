# PRD - Calculateur de Prix de Revient

## Problem Statement Original
Créer une application pour calculer le prix de revient d'un produit en prenant des coûts de main d'œuvre et la recette de production de l'article. 

### User Requests
- Application en PHP pour Apache avec MySQL
- Export PDF de la fiche prix de revient
- Authentification locale
- Import de recettes depuis fichier CSV

## Architecture

### Stack React/FastAPI (Déployée)
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **Auth**: JWT avec cookies HttpOnly

### Stack PHP (Code fourni)
- **Frontend**: PHP + Tailwind CSS CDN
- **Backend**: PHP 7.4+
- **Base de données**: MySQL
- **Auth**: Sessions PHP + bcrypt

## User Personas
1. **Artisan/PME**: Calcule le prix de revient de ses produits manufacturés
2. **Gestionnaire**: Gère les recettes, matières et frais généraux

## Core Requirements (Implémenté)
- [x] Gestion des matières premières (CRUD)
- [x] Gestion des recettes de production (CRUD)
- [x] Gestion des frais généraux (CRUD)
- [x] Calcul automatique du prix de revient
- [x] Authentification locale (email/mot de passe)
- [x] Export PDF des fiches de prix de revient
- [x] Import CSV des recettes
- [x] Dashboard avec statistiques

## What's Been Implemented

### React App (Live)
- **Date**: 29/03/2026
- Login/Register avec JWT
- Dashboard avec statistiques et graphiques
- CRUD complet matières premières
- CRUD complet recettes avec détail
- Ajout ingrédients depuis catalogue
- Ajout coûts main d'œuvre
- Affectation frais généraux
- Calcul prix de revient temps réel
- Export PDF
- Import CSV recettes

### PHP Code (Fourni)
- **Date**: 29/03/2026
- Structure complète pour Apache/MySQL
- Fichiers: config.php, database.sql, login.php, index.php, materials.php, recipes.php, recipe_detail.php, overheads.php, export_pdf.php

## Prioritized Backlog

### P0 (Critique) - Fait
- [x] Authentification
- [x] CRUD matières/recettes/frais
- [x] Calcul prix de revient
- [x] Export PDF

### P1 (Important) - Fait
- [x] Import CSV
- [x] Dashboard statistiques

### P2 (Nice to have)
- [ ] Gestion multi-utilisateurs
- [ ] Historique des prix
- [ ] Comparaison de recettes
- [ ] Export Excel
- [ ] Gestion des fournisseurs avancée

## Next Tasks
1. Télécharger le code PHP depuis /app/php_version/
2. Configurer Apache/MySQL sur votre serveur
3. Exécuter database.sql pour créer les tables
4. Modifier config.php avec vos paramètres

## Files Structure

### React App
```
/app/frontend/src/
├── App.js
├── context/AuthContext.jsx
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Materials.jsx
│   ├── Recipes.jsx
│   ├── RecipeDetail.jsx
│   └── Overheads.jsx
└── components/Layout.jsx
```

### PHP App
```
/app/php_version/
├── config.php
├── database.sql
├── login.php
├── index.php
├── materials.php
├── recipes.php
├── recipe_detail.php
├── overheads.php
├── export_pdf.php
├── csv_template.php
└── templates/
```
