# Documentation Metier - PrixRevient
## Calculateur de Prix de Revient Industriel

---

# Table des matieres

1. [Presentation generale](#1-presentation-generale)
2. [Concepts cles](#2-concepts-cles)
3. [Modules fonctionnels](#3-modules-fonctionnels)
4. [Regles de gestion et calculs](#4-regles-de-gestion-et-calculs)
5. [Gestion des roles et permissions](#5-gestion-des-roles-et-permissions)
6. [Import de donnees](#6-import-de-donnees)
7. [API KPI publique](#7-api-kpi-publique)
8. [Taches planifiees (Scheduler)](#8-taches-planifiees-scheduler)
9. [Simulation et analyse](#9-simulation-et-analyse)
10. [Glossaire](#10-glossaire)

---

# 1. Presentation generale

PrixRevient est une application web de calcul du prix de revient destinee aux
entreprises de production (agroalimentaire, industrie, artisanat). Elle permet
de determiner le cout reel d'un produit fini en integrant :

- Le cout des **matieres premieres** (avec pertes/freinte)
- Les **couts de main d'oeuvre** (heures x taux horaire)
- Les **frais generaux** (loyer, energie, amortissement, etc.)
- Les **sous-recettes** (articles semi-finis reutilisables)

L'application calcule automatiquement le **prix de revient unitaire** et
propose un **prix de vente conseille** en fonction de la marge cible.

---

# 2. Concepts cles

## 2.1 Prix de revient

Le prix de revient est le cout total de fabrication d'un produit, divise par
la quantite produite. Il inclut tous les couts directs et indirects.

```
Prix de revient unitaire = Cout total / Quantite produite

Cout total = Cout matieres + Cout main d'oeuvre + Frais generaux
```

## 2.2 Freinte (pertes de production)

La freinte represente le pourcentage de matiere premiere perdue lors de la
fabrication (evaporation, chutes, casse, epluchage, etc.).

**Exemple :** 1 kg de carottes avec 15% de freinte (epluchage) =
le cout reel est majore de 15%.

```
Cout reel = Cout base x (1 + Freinte% / 100)
Cout reel = (1 x 2.50) x (1 + 15/100) = 2.50 x 1.15 = 2.875 EUR
```

## 2.3 Nomenclature (BOM - Bill of Materials)

L'arbre de fabrication permet d'imbriquer des recettes les unes dans les
autres. Un article semi-fini (sous-recette) peut etre utilise comme
ingredient dans une recette parente.

**Exemple :**
```
Tarte aux pommes (produit fini)
  |-- Pate brisee (sous-recette semi-finie)
  |     |-- Farine (matiere premiere)
  |     |-- Beurre (matiere premiere)
  |     |-- Oeuf (matiere premiere)
  |-- Compote de pommes (sous-recette semi-finie)
  |     |-- Pommes (matiere premiere, freinte 12%)
  |     |-- Sucre (matiere premiere)
  |-- Main d'oeuvre : Assemblage (0.5h x 15 EUR/h)
  |-- Frais generaux : Cuisson four (affecte)
```

Le cout de chaque sous-recette est calcule recursivement, puis propage
au produit fini.

## 2.4 Marge et prix de vente

Le prix de vente conseille est calcule a partir du prix de revient et de la
marge cible :

```
Prix de vente = Prix de revient / (1 - Marge% / 100)

Exemple : Prix revient = 5.00 EUR, Marge = 30%
Prix de vente = 5.00 / (1 - 0.30) = 5.00 / 0.70 = 7.14 EUR
```

La marge est definie par recette (valeur par defaut : 30%).

---

# 3. Modules fonctionnels

## 3.1 Matieres premieres

Catalogue des ingredients et matieres utilisees dans la production.

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Nom | Designation de la matiere | Oui |
| Code article | Reference interne (ex: MAT-001) | Non |
| Unite | Unite de mesure (kg, L, piece, etc.) | Oui |
| Prix unitaire | Cout d'achat par unite (EUR) | Oui |
| Freinte (%) | Pourcentage de perte (0-100) | Non (defaut: 0) |
| Fournisseur | Fournisseur principal | Non |
| Categorie | Classification (epices, legumes, etc.) | Non |
| Stock | Quantite en stock | Non |

**Regle :** Quand le prix unitaire d'une matiere est modifie, l'ancien
prix est enregistre dans l'historique des prix matieres.

## 3.2 Fournisseurs

Referentiel des fournisseurs de matieres premieres.

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Nom | Raison sociale | Oui |
| Code | Reference interne (ex: FRN-001) | Non |
| Contact | Nom du contact | Non |
| Email | Adresse email | Non |
| Telephone | Numero de telephone | Non |
| Adresse | Adresse postale | Non |

## 3.3 Categories

Classification des matieres premieres pour le reporting et le filtrage.

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Nom | Nom de la categorie | Oui |
| Description | Precision optionnelle | Non |

## 3.4 Unites de mesure

Referentiel des unites utilisables dans l'application.

| Champ | Description |
|-------|-------------|
| Nom | Designation (Kilogramme, Litre, etc.) |
| Symbole | Abreviation (kg, L, pce, etc.) |
| Type | Poids / Volume / Quantite / Longueur |

## 3.5 Recettes

Une recette represente un produit (fini ou semi-fini) avec ses composants.

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Nom | Nom du produit | Oui |
| Description | Details du produit | Non |
| Quantite produite | Nombre d'unites fabriquees par recette | Oui (defaut: 1) |
| Unite de sortie | Unite du produit fini (piece, kg, L) | Oui |
| Marge cible (%) | Marge souhaitee pour le calcul du prix de vente | Oui (defaut: 30) |
| Semi-fini | Indique si c'est un article intermediaire reutilisable | Non (defaut: Non) |
| Fournisseur | Fournisseur associe (pour variantes) | Non |
| Version | Numero de version (V1, V2, etc.) | Non |

### Composition d'une recette

Une recette contient :

1. **Ingredients** (matieres premieres) : quantite + prix unitaire + freinte
2. **Sous-recettes** (articles semi-finis) : quantite utilisee
3. **Main d'oeuvre** : description + heures + taux horaire
4. **Frais generaux affectes** : selectionnes parmi le referentiel

### Variantes fournisseur/version

Une meme recette peut exister en plusieurs variantes (fournisseur different,
version amelioree). Cela permet de comparer les couts d'approvisionnement.

## 3.6 Frais generaux

Charges indirectes affectees aux produits.

| Champ | Description | Obligatoire |
|-------|-------------|:-----------:|
| Nom | Designation (Loyer, Electricite, etc.) | Oui |
| Categorie | Type (Infrastructure, Equipement, etc.) | Oui |
| Montant mensuel | Cout mensuel en EUR | Oui |
| Methode d'affectation | Comment repartir le cout | Oui |
| Valeur d'affectation | Diviseur pour le calcul | Oui |

### Methodes d'affectation

| Methode | Formule | Exemple |
|---------|---------|---------|
| Par unite | Montant / Valeur | 1000 EUR / 500 unites = 2 EUR/unite |
| Par heure | (Montant / Valeur) x Heures MO | (1000 / 160h) x 2h = 12.50 EUR |

## 3.7 Sites de production

Support multi-sites pour les entreprises avec plusieurs usines/ateliers.

| Champ | Description |
|-------|-------------|
| Nom | Nom du site |
| Adresse | Localisation |
| Par defaut | Site utilise par defaut |

---

# 4. Regles de gestion et calculs

## 4.1 Calcul du cout matieres

Pour chaque ingredient d'une recette :

```
Cout base = Quantite x Prix unitaire
Cout freinte = Cout base x (Freinte% / 100)
Cout ingredient = Cout base + Cout freinte

Cout total matieres = Somme de tous les couts ingredients
```

**Regle :** La freinte est un pourcentage de perte. Un ingredient a 2 EUR
avec 10% de freinte coute reellement 2.20 EUR.

## 4.2 Calcul du cout des sous-recettes

Le cout d'une sous-recette est calcule recursivement :

```
1. Calculer le cout total de la sous-recette (matieres + MO)
2. Diviser par sa quantite produite = Cout unitaire sous-recette
3. Multiplier par la quantite utilisee dans la recette parente
```

**Regle :** La profondeur maximale de recursion est de 10 niveaux
(protection contre les references circulaires).

**Regle :** Une recette ne peut pas s'ajouter elle-meme comme sous-recette.

## 4.3 Calcul du cout main d'oeuvre

```
Cout MO = Somme(Heures x Taux horaire) pour chaque poste

Exemple :
  Preparation : 1.5h x 15 EUR/h = 22.50 EUR
  Cuisson     : 0.5h x 12 EUR/h =  6.00 EUR
  Total MO    : 28.50 EUR
```

## 4.4 Calcul des frais generaux

Pour chaque frais general affecte a la recette :

```
Methode "par unite" :
  Cout = Montant mensuel / Valeur d'affectation

Methode "par heure" :
  Taux horaire FG = Montant mensuel / Valeur d'affectation
  Cout = Taux horaire FG x Total heures MO de la recette
```

## 4.5 Calcul final du prix de revient

```
Cout total = Cout matieres + Cout MO + Cout frais generaux

Prix de revient unitaire = Cout total / Quantite produite

Prix de vente conseille = Prix revient / (1 - Marge% / 100)
```

### Exemple complet

**Recette : Eclair au chocolat (production de 10 pieces)**

| Composant | Detail | Cout |
|-----------|--------|-----:|
| Farine | 0.3 kg x 1.20 EUR/kg | 0.36 EUR |
| Beurre | 0.15 kg x 8.50 EUR/kg | 1.28 EUR |
| Oeufs | 4 pce x 0.25 EUR/pce | 1.00 EUR |
| Chocolat | 0.2 kg x 12 EUR/kg, freinte 5% | 2.52 EUR |
| Creme | 0.5 L x 3.80 EUR/L | 1.90 EUR |
| **Total matieres** | | **7.06 EUR** |
| Preparation | 1h x 15 EUR/h | 15.00 EUR |
| Cuisson | 0.5h x 12 EUR/h | 6.00 EUR |
| **Total MO** | | **21.00 EUR** |
| Electricite four | 500 EUR / 200 unites | 2.50 EUR |
| **Total frais** | | **2.50 EUR** |
| **Cout total** | | **30.56 EUR** |
| **Prix revient/piece** | 30.56 / 10 | **3.06 EUR** |
| **Prix vente (marge 30%)** | 3.06 / 0.70 | **4.37 EUR** |

---

# 5. Gestion des roles et permissions (RBAC)

L'application propose 3 niveaux d'acces :

| Fonctionnalite | Admin | Manager | Operateur |
|----------------|:-----:|:-------:|:---------:|
| Tableau de bord | Oui | Oui | Oui |
| Consulter matieres/recettes | Oui | Oui | Oui |
| Creer/modifier matieres | Oui | Oui | Oui |
| Creer/modifier recettes | Oui | Oui | Oui |
| Exporter PDF/Excel | Oui | Oui | Oui |
| Importer CSV | Oui | Oui | Non |
| Gerer les fournisseurs | Oui | Oui | Non |
| Enregistrer historique prix | Oui | Oui | Non |
| Parametres application | Oui | Non | Non |
| Gestion des utilisateurs | Oui | Non | Non |
| Gestion des cles API | Oui | Non | Non |
| Taches planifiees | Oui | Non | Non |
| Configuration SSO | Oui | Non | Non |

**Regle :** Seul l'administrateur peut creer de nouveaux comptes utilisateurs.
L'inscription publique est desactivee.

**Regle :** Un administrateur ne peut pas desactiver ou supprimer son propre
compte.

---

# 6. Import de donnees

## 6.1 Import CSV manuel

L'application accepte les fichiers CSV avec separateur **point-virgule (;)**
ou **virgule (,)** (detection automatique).

### Format CSV Matieres premieres

```csv
name;unit;unit_price;supplier;freinte;stock
Farine T55;kg;1.20;Moulin du Nord;2;50
Beurre AOP;kg;8.50;Laiterie Dupont;0;20
```

### Format CSV Fournisseurs

```csv
name;contact;email;phone;address
Moulin du Nord;Jean Martin;contact@moulin.fr;0321456789;Lille
```

### Format CSV Categories

```csv
name;description
Farines;Farines et feculents
Produits laitiers;Lait, creme, beurre
```

### Format CSV Recettes (simples)

```csv
name;description;output_quantity;output_unit;margin;is_intermediate;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;freinte;sub_recipe;labor_description;labor_hours;labor_rate
```

### Format CSV BOM (arbre de fabrication)

Meme format que les recettes, avec le champ `sub_recipe` renseigne pour
les articles semi-finis.

## 6.2 Import SFTP automatique

Le dossier `/opt/prixrevient/backend/import_watch/` est surveille.
Les fichiers CSV deposes sont importes automatiquement selon leur prefixe :

| Prefixe fichier | Type d'import |
|-----------------|---------------|
| `materials_*.csv` | Matieres premieres |
| `recettes_*.csv` ou `recipes_*.csv` | Recettes simples |
| `bom_*.csv` ou `arbre_*.csv` | Arbre de fabrication |
| `suppliers_*.csv` ou `fournisseurs_*.csv` | Fournisseurs |
| `categories_*.csv` | Categories |

Apres traitement, les fichiers sont deplaces dans le sous-dossier `processed/`.

## 6.3 Historique des imports

Chaque import (manuel ou automatique) est enregistre dans la base de donnees
avec : nom du fichier, type, statut (succes/erreur), nombre d'elements
importes, et details d'erreur le cas echeant.

L'historique est consultable dans **Parametres > Import > Historique**.

---

# 7. API KPI publique

L'application expose une API REST publique pour l'integration avec des
outils tiers (ERP, BI, tableaux de bord).

## 7.1 Authentification

L'acces se fait via une **cle API** (header `X-API-Key`).
Les cles sont generees dans **Parametres > API**.

```bash
curl -H "X-API-Key: votre-cle" https://calculprix.appli-sciad.com/api/kpi/summary
```

## 7.2 Endpoints disponibles

| Endpoint | Description |
|----------|-------------|
| `GET /api/kpi/summary` | Resume global (nb matieres, recettes, cout moyen) |
| `GET /api/kpi/recipes` | Liste des recettes avec couts calcules |
| `GET /api/kpi/materials` | Liste des matieres premieres |
| `GET /api/kpi/costs` | Tableau detaille des couts par recette |
| `GET /api/kpi/categories` | Couts agrages par categorie |

## 7.3 Cas d'usage

- **Dashboard BI** : Recuperer les KPI pour Power BI, Metabase, etc.
- **ERP** : Synchroniser les prix de revient avec le systeme de gestion
- **Alertes externes** : Surveiller les variations de couts

---

# 8. Taches planifiees (Scheduler)

L'application integre un scheduler (APScheduler) qui execute
automatiquement des taches en arriere-plan.

## 8.1 Types de taches

| Type | Description | Action |
|------|-------------|--------|
| Scan SFTP | Surveille le dossier d'import | Importe les CSV deposes |
| Historique prix | Enregistre les prix actuels | Capture un snapshot de tous les couts |

## 8.2 Frequences disponibles

| Expression | Frequence |
|------------|-----------|
| `*/5 * * * *` | Toutes les 5 minutes |
| `*/15 * * * *` | Toutes les 15 minutes |
| `*/30 * * * *` | Toutes les 30 minutes |
| `0 * * * *` | Toutes les heures |
| `0 */6 * * *` | Toutes les 6 heures |
| `0 8 * * *` | Chaque jour a 8h |
| `0 8 * * 1-5` | Du lundi au vendredi a 8h |

## 8.3 Fonctionnement

- Les taches sont gerees dans **Parametres > Taches planifiees**
- Chaque tache peut etre activee/desactivee individuellement
- Le bouton "Play" permet une execution manuelle immediate
- Le dernier statut (OK/Erreur) et resultat sont affiches
- Le scheduler demarre automatiquement au lancement de l'application
- Toute modification (creation, activation, suppression) synchronise
  immediatement le scheduler

---

# 9. Simulation et analyse

## 9.1 Simulation What-If (page dediee)

Accessible via **Simulation** dans le menu lateral.

Permet de simuler l'impact d'une variation de prix d'une matiere premiere
sur l'ensemble des recettes qui l'utilisent.

**Fonctionnement :**
1. Selectionner une matiere premiere
2. Choisir un pourcentage de variation (ex: +10%, -5%)
3. L'application recalcule le prix de revient de toutes les recettes
   contenant cette matiere
4. Un tableau affiche l'ancien prix, le nouveau prix, et l'ecart

**Cas d'usage :** Anticiper l'impact d'une hausse fournisseur.

## 9.2 Simulation live (detail recette)

Sur la page de detail d'une recette, le bouton **"Simuler"** active un
mode d'edition temporaire.

**Fonctionnement :**
1. Cliquer sur "Simuler" dans la section Matieres premieres
2. Les champs Quantite, Prix unitaire et Freinte deviennent editables
3. Les champs Heures et Taux horaire de la main d'oeuvre aussi
4. Les couts sont recalcules **en temps reel** dans les cartes du haut
5. Les lignes modifiees sont surlignees en orange
6. Un bandeau jaune indique "Mode simulation active"
7. Cliquer sur "Reinitialiser" pour revenir aux valeurs reelles
8. Cliquer sur "Quitter simulation" pour desactiver le mode

**Regle importante :** Les modifications en mode simulation ne sont
**jamais enregistrees** en base de donnees. C'est un outil d'analyse
temporaire (what-if).

## 9.3 Comparaison de recettes

La page **Comparaison** permet de selectionner 2 recettes et d'afficher
cote a cote leurs couts detailles (matieres, MO, frais, prix unitaire,
prix de vente).

## 9.4 Evolution des prix (Dashboard)

Le graphique **"Evolution des prix de revient"** sur le tableau de bord
affiche l'historique des prix de revient sur 90 jours, avec une courbe
par recette.

**Prerequis :** Configurer une tache planifiee "Historique prix" pour
capturer regulierement les snapshots de couts.

## 9.5 Alertes prix matieres (Dashboard)

Le panneau **"Alertes prix matieres"** affiche les matieres premieres
dont le prix a varie au-dela du seuil configure (defaut : 10%).

| Indicateur | Signification |
|------------|---------------|
| Fleche rouge vers le haut | Hausse de prix |
| Fleche verte vers le bas | Baisse de prix |
| Pourcentage | Amplitude de la variation |

## 9.6 Resume des couts (Arbre de fabrication)

Dans l'arbre de fabrication, le bouton **"Detail"** sur chaque recette
ouvre un popup avec le resume complet des couts :

- Prix de revient unitaire, cout total, prix de vente conseille
- Repartition par poste (matieres, main d'oeuvre, frais generaux)
  avec pourcentage du total et cout de la freinte
- Detail de chaque matiere premiere, sous-recette et poste de MO
- Quantite de production

---

# 10. Glossaire

| Terme | Definition |
|-------|------------|
| **BOM** | Bill of Materials - Nomenclature/arbre de fabrication |
| **Freinte** | Pourcentage de perte lors de la transformation d'une matiere |
| **Semi-fini** | Produit intermediaire utilise comme composant d'un produit fini |
| **Prix de revient** | Cout total de fabrication divise par la quantite produite |
| **Marge cible** | Pourcentage de marge souhaite sur le prix de vente |
| **Prix de vente conseille** | Prix calcule pour atteindre la marge cible |
| **Frais generaux** | Charges indirectes affectees aux produits (loyer, energie, etc.) |
| **RBAC** | Role-Based Access Control - Controle d'acces par role |
| **API KPI** | Interface programmatique pour extraire les indicateurs cles |
| **Scheduler** | Planificateur de taches automatiques integre a l'application |
| **SSO** | Single Sign-On - Authentification unique (Google / Microsoft) |
| **SFTP** | Protocole de transfert de fichiers securise |

---

*Document genere le 1er avril 2026 - PrixRevient v11*
