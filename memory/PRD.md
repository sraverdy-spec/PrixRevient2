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
- [x] **Freinte (pertes matieres)**: Pourcentage de perte sur chaque matiere premiere, integre dans le calcul des couts
- [x] **Import CSV matieres premieres**: Upload de fichiers CSV (colonnes: name, unit, unit_price, supplier, freinte)
- [x] **Arbre de fabrication**: Articles semi-finis (is_intermediate) utilisables comme sous-recettes dans d'autres recettes
- [x] **Calcul des sous-recettes**: Le cout d'un article semi-fini est automatiquement integre dans la recette parente
- [x] **Marge commerciale**: Marge cible configurable par recette, prix de vente conseille affiche
- [x] **CRUD Fournisseurs**: Gestion des fournisseurs
- [x] **CRUD Categories**: Gestion des categories
- [x] **Tableau des couts complet**: Vue d'ensemble de tous les couts avec export Excel
- [x] **Comparaison de recettes**: Comparer les couts entre recettes
- [x] **Page BOM Tree**: Visualisation de l'arbre de fabrication (produits finis vs semi-finis)
- [x] **Menu repliable**: Sidebar collapsible
- [x] **Couts main d'oeuvre visibles**: Affichage clair dans le detail de recette et le recapitulatif

## Endpoints API
- POST /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
- GET/POST /api/materials, GET/PUT/DELETE /api/materials/{id}
- POST /api/materials/import-csv, GET /api/materials/csv-template
- GET/POST /api/recipes, GET/PUT/DELETE /api/recipes/{id}
- GET /api/recipes/{id}/cost, GET /api/recipes/{id}/pdf
- GET /api/recipes/intermediate
- POST /api/recipes/import-csv, GET /api/recipes/csv-template
- GET/POST /api/overheads, GET/PUT/DELETE /api/overheads/{id}
- GET/POST /api/suppliers, GET/PUT/DELETE /api/suppliers/{id}
- GET/POST /api/categories, GET/PUT/DELETE /api/categories/{id}
- GET /api/dashboard/stats, /api/costs/all, /api/costs/export

## Schema DB
- users: {email, hashed_password, name, role}
- raw_materials: {id, name, unit, unit_price, supplier_name, category_id, freinte, description}
- recipes: {id, name, description, output_quantity, output_unit, ingredients[], labor_costs[], overhead_ids[], target_margin, is_intermediate, category_id}
- overheads: {id, name, category, monthly_amount, allocation_method, allocation_value}
- suppliers: {id, name, contact, email, phone, address}
- categories: {id, name, description}

## Credentials
- Admin: admin@example.com / Admin123!

## Backlog / Taches futures
- P2: Module simulation (scenarios de cout)
- P2: Historique des prix et tendances
- P2: Gestion multi-utilisateurs
- P2: Notifications d'alerte stock
- P3: Application PHP standalone (existe dans /app/php_version/)
