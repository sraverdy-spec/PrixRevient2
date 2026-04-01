# Modele de Donnees - PrixRevient
## Base de donnees MongoDB : cost_calculator

---

# Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Diagramme des relations](#2-diagramme-des-relations)
3. [Collections](#3-collections)
4. [Objets imbriques](#4-objets-imbriques)
5. [Objets calcules (non stockes)](#5-objets-calcules-non-stockes)
6. [Index](#6-index)

---

# 1. Vue d'ensemble

L'application utilise **MongoDB** comme base de donnees NoSQL.
La base s'appelle `cost_calculator` et contient **13 collections**.

| Collection | Description | Volume estime |
|------------|-------------|---------------|
| users | Comptes utilisateurs | < 50 |
| raw_materials | Matieres premieres | 100 - 5 000 |
| recipes | Recettes (finis + semi-finis) | 50 - 2 000 |
| categories | Categories de matieres | 10 - 50 |
| suppliers | Fournisseurs | 20 - 200 |
| overheads | Frais generaux | 5 - 30 |
| units | Unites de mesure | 10 - 30 |
| sites | Sites de production | 1 - 10 |
| crontabs | Taches planifiees | 1 - 10 |
| import_logs | Historique des imports | Croissant |
| price_history | Historique prix recettes | Croissant |
| price_history_materials | Historique prix matieres | Croissant |
| api_keys | Cles API publiques | 1 - 10 |
| settings | Parametres application | 1 (document unique) |

---

# 2. Diagramme des relations

```
                          +------------------+
                          |     settings     |
                          | (document unique)|
                          +------------------+

+----------+                                    +----------+
|  users   |---1:N--->[ recipes (user_id) ]     |  sites   |
+----------+                                    +----------+

+------------+       +--------------+       +-------------+
| categories |--1:N--| raw_materials|--N:1--| suppliers   |
+------------+       +--------------+       +-------------+
                           |
                     [ingredients]
                           |
                     +-----v------+       +-------------+
                     |  recipes   |--N:N--| overheads   |
                     +------------+       +-------------+
                           |
              +------------+------------+
              |            |            |
        [ingredients] [labor_costs] [overhead_ids]
              |
      +-------v--------+
      | sous-recettes   |
      | (is_intermediate)|
      | = recipe auto-  |
      |   referencee    |
      +----------------+

+------------+          +------------------------+
|  crontabs  |          |     import_logs        |
+------------+          +------------------------+

+------------+          +------------------------+
|  api_keys  |          |     price_history      |
+------------+          +------------------------+

+-------+
| units |
+-------+
```

### Relations cles

| Relation | Type | Description |
|----------|------|-------------|
| recipes.ingredients[].material_id -> raw_materials.id | N:1 | Chaque ingredient reference une matiere |
| recipes.ingredients[].sub_recipe_id -> recipes.id | N:1 | Sous-recette (auto-reference) |
| recipes.overhead_ids[] -> overheads.id | N:N | Frais generaux affectes |
| recipes.supplier_id -> suppliers.id | N:1 | Fournisseur de la recette |
| recipes.category_id -> categories.id | N:1 | Categorie de la recette |
| recipes.user_id -> users.email | N:1 | Createur de la recette |
| raw_materials.supplier_id -> suppliers.id | N:1 | Fournisseur de la matiere |
| raw_materials.category_id -> categories.id | N:1 | Categorie de la matiere |
| price_history.recipe_id -> recipes.id | N:1 | Historique lie a une recette |
| price_history_materials.material_id -> raw_materials.id | N:1 | Historique lie a une matiere |

---

# 3. Collections

## 3.1 users

Comptes utilisateurs de l'application.

```json
{
  "email": "admin@example.com",
  "password_hash": "$2b$12$...",
  "name": "Administrateur",
  "role": "admin",
  "is_active": true,
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| email | string | Oui | Email unique (cle fonctionnelle) |
| password_hash | string | Oui | Hash bcrypt du mot de passe |
| name | string | Oui | Nom affiche |
| role | string | Oui | "admin", "manager" ou "operator" |
| is_active | boolean | Oui | Compte actif/desactive |
| created_at | datetime | Auto | Date de creation |

**Index** : `email` (unique)

---

## 3.2 raw_materials

Catalogue des matieres premieres.

```json
{
  "id": "uuid-xxx",
  "name": "Farine de ble T55",
  "code_article": "MAT-001",
  "unit": "kg",
  "unit_price": 1.20,
  "supplier_id": "uuid-supplier",
  "supplier_name": "Moulin du Nord",
  "category_id": "uuid-category",
  "description": "Farine standard panification",
  "freinte": 2.0,
  "stock_quantity": 50.0,
  "stock_alert_threshold": 10.0,
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Defaut | Description |
|-------|------|:------:|:------:|-------------|
| id | string (UUID) | Auto | uuid4 | Identifiant unique |
| name | string | Oui | - | Designation |
| code_article | string | Non | null | Reference interne |
| unit | string | Oui | - | Unite de mesure (kg, L, pce...) |
| unit_price | float | Oui | - | Prix d'achat unitaire (EUR) |
| supplier_id | string | Non | null | ID du fournisseur |
| supplier_name | string | Non | null | Nom du fournisseur (denormalise) |
| category_id | string | Non | null | ID de la categorie |
| description | string | Non | null | Description libre |
| freinte | float | Non | 0.0 | Pourcentage de perte (0-100) |
| stock_quantity | float | Non | 0.0 | Quantite en stock |
| stock_alert_threshold | float | Non | 0.0 | Seuil d'alerte de stock |
| created_at | datetime | Auto | now() | Date de creation |

---

## 3.3 recipes

Recettes de fabrication (produits finis et semi-finis).

```json
{
  "id": "uuid-xxx",
  "name": "Tarte aux pommes",
  "description": "Tarte classique",
  "category_id": "uuid-category",
  "supplier_id": "uuid-supplier",
  "supplier_name": "Boulangerie Martin",
  "version": 1,
  "output_quantity": 8.0,
  "output_unit": "piece",
  "target_margin": 35.0,
  "is_intermediate": false,
  "ingredients": [ ... ],
  "labor_costs": [ ... ],
  "overhead_ids": ["uuid-overhead-1", "uuid-overhead-2"],
  "user_id": "admin@example.com",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T14:30:00Z"
}
```

| Champ | Type | Requis | Defaut | Description |
|-------|------|:------:|:------:|-------------|
| id | string (UUID) | Auto | uuid4 | Identifiant unique |
| name | string | Oui | - | Nom du produit |
| description | string | Non | null | Description |
| category_id | string | Non | null | ID categorie |
| supplier_id | string | Non | null | ID fournisseur |
| supplier_name | string | Non | null | Nom fournisseur (denormalise) |
| version | int | Non | 1 | Numero de version |
| output_quantity | float | Non | 1.0 | Quantite produite par recette |
| output_unit | string | Non | "piece" | Unite du produit fini |
| target_margin | float | Non | 30.0 | Marge cible (%) |
| is_intermediate | bool | Non | false | Article semi-fini (sous-recette) |
| ingredients | RecipeIngredient[] | Non | [] | Liste des ingredients |
| labor_costs | LaborCost[] | Non | [] | Postes de main d'oeuvre |
| overhead_ids | string[] | Non | [] | IDs des frais generaux affectes |
| user_id | string | Non | null | Email du createur |
| created_at | datetime | Auto | now() | Date de creation |
| updated_at | datetime | Auto | now() | Derniere modification |

---

## 3.4 categories

Categories de matieres premieres et recettes.

```json
{
  "id": "uuid-xxx",
  "name": "Produits laitiers",
  "description": "Lait, creme, beurre, fromage",
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Nom de la categorie |
| description | string | Non | Description |
| created_at | datetime | Auto | Date de creation |

---

## 3.5 suppliers

Referentiel des fournisseurs.

```json
{
  "id": "uuid-xxx",
  "name": "Moulin du Nord",
  "code": "FRN-001",
  "contact": "Jean Martin",
  "email": "contact@moulin.fr",
  "phone": "0321456789",
  "address": "12 rue des Meuniers, 59000 Lille",
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Raison sociale |
| code | string | Non | Code interne (ex: FRN-001) |
| contact | string | Non | Nom du contact |
| email | string | Non | Adresse email |
| phone | string | Non | Telephone |
| address | string | Non | Adresse postale |
| created_at | datetime | Auto | Date de creation |

---

## 3.6 overheads

Frais generaux (charges indirectes).

```json
{
  "id": "uuid-xxx",
  "name": "Electricite atelier",
  "category": "Energie",
  "monthly_amount": 800.0,
  "allocation_method": "per_unit",
  "allocation_value": 500.0,
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Designation |
| category | string | Oui | Type (Energie, Infrastructure, Equipement...) |
| monthly_amount | float | Oui | Montant mensuel (EUR) |
| allocation_method | string | Oui | "per_unit" ou "per_hour" |
| allocation_value | float | Non | Diviseur pour l'affectation |
| created_at | datetime | Auto | Date de creation |

---

## 3.7 units

Unites de mesure disponibles.

```json
{
  "id": "uuid-xxx",
  "name": "Kilogramme",
  "symbol": "kg",
  "type": "Poids"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Nom complet |
| symbol | string | Oui | Abreviation |
| type | string | Oui | Poids / Volume / Quantite / Longueur |

---

## 3.8 sites

Sites de production (multi-sites).

```json
{
  "id": "uuid-xxx",
  "name": "Usine principale",
  "address": "Zone Industrielle, 59000 Lille",
  "is_default": true,
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Nom du site |
| address | string | Non | Localisation |
| is_default | bool | Non | Site par defaut |
| created_at | datetime | Auto | Date de creation |

---

## 3.9 crontabs

Taches planifiees (scheduler APScheduler).

```json
{
  "id": "uuid-xxx",
  "name": "Scan SFTP automatique",
  "type": "sftp_scan",
  "schedule": "*/30 * * * *",
  "enabled": true,
  "last_run": "2026-04-01T21:30:00Z",
  "last_result": "OK",
  "last_status": "success",
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| name | string | Oui | Nom de la tache |
| type | string | Oui | "sftp_scan" ou "price_history" |
| schedule | string | Oui | Expression cron (ex: */30 * * * *) |
| enabled | bool | Non | Tache active/inactive |
| last_run | string (ISO) | Auto | Derniere execution |
| last_result | string | Auto | Resultat de la derniere execution |
| last_status | string | Auto | "success" ou "error" |
| created_at | string (ISO) | Auto | Date de creation |

---

## 3.10 import_logs

Historique des imports CSV (manuels et automatiques).

```json
{
  "id": "uuid-xxx",
  "filename": "materials_20260401.csv",
  "type": "materials",
  "source": "upload",
  "status": "success",
  "user": "admin@example.com",
  "imported_count": 25,
  "error_details": null,
  "result": {
    "success": true,
    "imported_count": 25,
    "errors": []
  },
  "timestamp": "2026-04-01T14:30:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| filename | string | Oui | Nom du fichier importe |
| type | string | Oui | materials / recipes / bom / suppliers / categories |
| source | string | Oui | "upload" (manuel) ou "sftp" (automatique) |
| status | string | Oui | "success" ou "error" |
| user | string | Non | Email de l'utilisateur |
| imported_count | int | Non | Nombre d'elements importes |
| error_details | string | Non | Detail de l'erreur (si echec) |
| result | object | Non | Resultat detaille (imported_count, errors[]) |
| timestamp | string (ISO) | Auto | Date de l'import |

---

## 3.11 price_history

Historique des prix de revient des recettes (snapshots).

```json
{
  "id": "uuid-xxx",
  "recipe_id": "uuid-recipe",
  "recipe_name": "Tarte aux pommes",
  "supplier_name": "Boulangerie Martin",
  "version": "1",
  "cost_per_unit": 3.06,
  "total_cost": 30.56,
  "recorded_at": "2026-04-01T08:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| recipe_id | string | Oui | ID de la recette |
| recipe_name | string | Oui | Nom de la recette (denormalise) |
| supplier_name | string | Non | Fournisseur (denormalise) |
| version | string | Non | Version de la recette |
| cost_per_unit | float | Oui | Prix de revient unitaire |
| total_cost | float | Oui | Cout total de production |
| recorded_at | string (ISO) | Auto | Date de l'enregistrement |

---

## 3.12 price_history_materials

Historique des prix d'achat des matieres premieres.

```json
{
  "id": "uuid-xxx",
  "material_id": "uuid-material",
  "material_name": "Farine de ble T55",
  "unit_price": 1.20,
  "supplier_name": "Moulin du Nord",
  "recorded_at": "2026-04-01T08:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| material_id | string | Oui | ID de la matiere |
| material_name | string | Oui | Nom de la matiere (denormalise) |
| unit_price | float | Oui | Prix unitaire enregistre |
| supplier_name | string | Non | Fournisseur |
| recorded_at | string (ISO) | Auto | Date de l'enregistrement |

---

## 3.13 api_keys

Cles d'acces a l'API KPI publique.

```json
{
  "id": "uuid-xxx",
  "key": "pk_live_xxxxxxxxxxxxxxxxxxxx",
  "name": "Cle Power BI",
  "created_by": "admin@example.com",
  "is_active": true,
  "last_used": "2026-04-01T15:00:00Z",
  "created_at": "2026-04-01T10:00:00Z"
}
```

| Champ | Type | Requis | Description |
|-------|------|:------:|-------------|
| id | string (UUID) | Auto | Identifiant unique |
| key | string | Auto | Cle API generee (prefixe pk_live_) |
| name | string | Oui | Nom descriptif |
| created_by | string | Oui | Email du createur |
| is_active | bool | Oui | Cle active/revoquee |
| last_used | string (ISO) | Auto | Derniere utilisation |
| created_at | string (ISO) | Auto | Date de creation |

---

## 3.14 settings

Parametres globaux de l'application (document unique).

```json
{
  "key": "app_settings",
  "primary_color": "#002FA7",
  "company_name": "Mon Entreprise",
  "logo_data": "data:image/png;base64,...",
  "currency": "EUR",
  "default_margin": 30.0,
  "price_alert_threshold": 10.0,
  "sso_google_enabled": false,
  "sso_google_client_id": "",
  "sso_google_client_secret": "",
  "sso_microsoft_enabled": false,
  "sso_microsoft_client_id": "",
  "sso_microsoft_client_secret": "",
  "sso_microsoft_tenant_id": ""
}
```

| Champ | Type | Description |
|-------|------|-------------|
| key | string | Toujours "app_settings" |
| primary_color | string | Couleur principale (#hex) |
| company_name | string | Nom de l'entreprise |
| logo_data | string | Logo en base64 |
| currency | string | Devise (EUR, USD...) |
| default_margin | float | Marge par defaut (%) |
| price_alert_threshold | float | Seuil d'alerte prix (%) |
| sso_google_enabled | bool | Google SSO actif |
| sso_google_client_id | string | OAuth Client ID Google |
| sso_google_client_secret | string | OAuth Client Secret Google |
| sso_microsoft_enabled | bool | Microsoft SSO actif |
| sso_microsoft_client_id | string | OAuth Client ID Microsoft |
| sso_microsoft_client_secret | string | OAuth Client Secret Microsoft |
| sso_microsoft_tenant_id | string | Azure AD Tenant ID |

---

# 4. Objets imbriques

Ces objets sont stockes **a l'interieur** des documents recettes (pas dans des collections separees).

## 4.1 RecipeIngredient

Ingredient d'une recette (matiere premiere ou sous-recette).

```json
{
  "material_id": "uuid-material",
  "material_name": "Farine de ble T55",
  "sub_recipe_id": null,
  "quantity": 0.3,
  "unit": "kg",
  "unit_price": 1.20,
  "freinte": 2.0,
  "is_sub_recipe": false
}
```

| Champ | Type | Description |
|-------|------|-------------|
| material_id | string | ID de la matiere premiere (null si sous-recette) |
| material_name | string | Nom de la matiere / sous-recette |
| sub_recipe_id | string | ID de la sous-recette (null si matiere) |
| quantity | float | Quantite utilisee |
| unit | string | Unite |
| unit_price | float | Prix unitaire |
| freinte | float | % de perte (0-100) |
| is_sub_recipe | bool | true = sous-recette, false = matiere |

## 4.2 LaborCost

Poste de main d'oeuvre d'une recette.

```json
{
  "description": "Preparation pate",
  "hours": 1.5,
  "hourly_rate": 15.0
}
```

| Champ | Type | Description |
|-------|------|-------------|
| description | string | Description du poste |
| hours | float | Nombre d'heures |
| hourly_rate | float | Taux horaire (EUR/h) |

---

# 5. Objets calcules (non stockes)

Ces objets sont generes a la volee par l'API et ne sont pas persistes en base.

## 5.1 CostBreakdown

Resultat du calcul du prix de revient d'une recette.
Endpoint : `GET /api/recipes/{id}/cost`

```json
{
  "recipe_id": "uuid-xxx",
  "recipe_name": "Tarte aux pommes",
  "total_material_cost": 7.06,
  "total_labor_cost": 21.00,
  "total_overhead_cost": 2.50,
  "total_freinte_cost": 0.52,
  "total_cost": 30.56,
  "cost_per_unit": 3.06,
  "output_quantity": 10.0,
  "output_unit": "piece",
  "target_margin": 30.0,
  "suggested_price": 4.37,
  "material_details": [
    { "name": "Farine", "quantity": 0.3, "unit": "kg", "unit_cost": 1.20, "total_cost": 0.36, "freinte_cost": 0.01 }
  ],
  "labor_details": [
    { "description": "Preparation", "hours": 1.5, "hourly_rate": 15.0, "total_cost": 22.50 }
  ],
  "overhead_details": [
    { "name": "Electricite", "cost": 2.50 }
  ],
  "sub_recipe_details": [
    { "name": "Pate brisee", "quantity": 0.5, "unit": "kg", "unit_cost": 32.99, "total_cost": 16.49 }
  ]
}
```

## 5.2 SimulationResult

Resultat d'une simulation what-if.
Endpoint : `POST /api/simulate`

```json
{
  "recipe_id": "uuid-xxx",
  "recipe_name": "Tarte aux pommes",
  "original_cost": 3.06,
  "simulated_cost": 3.42,
  "difference": 0.36,
  "difference_pct": 11.76,
  "details": { ... }
}
```

---

# 6. Index

| Collection | Champ(s) | Type | Raison |
|------------|----------|------|--------|
| users | email | Unique | Authentification rapide |
| raw_materials | id | Unique | Recherche par ID |
| recipes | id | Unique | Recherche par ID |
| recipes | is_intermediate | Standard | Filtrage semi-finis |
| categories | id | Unique | Recherche par ID |
| suppliers | id | Unique | Recherche par ID |
| overheads | id | Unique | Recherche par ID |
| import_logs | timestamp | Descendant | Tri chronologique |
| price_history | recipe_id, recorded_at | Compose | Historique par recette |
| price_history_materials | material_id, recorded_at | Compose | Historique par matiere |
| api_keys | key | Unique | Authentification API |
| crontabs | id | Unique | Recherche par ID |
| settings | key | Unique | Document unique |

---

*Document genere le 1er avril 2026 - PrixRevient v11*
