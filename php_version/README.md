# Application PHP - Calculateur de Prix de Revient

## Installation sur Apache/MySQL

### Prérequis
- PHP 7.4+ avec extensions: pdo, pdo_mysql, mbstring
- Apache avec mod_rewrite
- MySQL 5.7+

### Installation

1. **Copier les fichiers** dans le dossier web (ex: `/var/www/html/prix-revient/`)

2. **Configurer la base de données MySQL:**
   ```bash
   mysql -u root -p < database.sql
   ```

3. **Modifier `config.php`** avec vos paramètres:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'prix_revient');
   define('DB_USER', 'votre_utilisateur');
   define('DB_PASS', 'votre_mot_de_passe');
   define('JWT_SECRET', 'votre_cle_secrete_64_caracteres');
   ```

4. **Configurer Apache** (.htaccess ou virtual host):
   ```apache
   <Directory /var/www/html/prix-revient>
       AllowOverride All
       Require all granted
   </Directory>
   ```

5. **Permissions:**
   ```bash
   chmod 755 -R /var/www/html/prix-revient
   ```

### Connexion par défaut
- **Email:** admin@example.com
- **Mot de passe:** Admin123!

## Structure des fichiers

```
/php_version/
├── config.php              # Configuration et fonctions utilitaires
├── database.sql            # Script de création de la base de données
├── login.php               # Page de connexion/inscription
├── logout.php              # Déconnexion
├── index.php               # Tableau de bord
├── materials.php           # Gestion des matières premières
├── recipes.php             # Liste des recettes + import CSV
├── recipe_detail.php       # Détail d'une recette (à créer)
├── overheads.php           # Gestion des frais généraux (à créer)
├── export_pdf.php          # Export PDF d'une fiche de prix de revient
├── csv_template.php        # Téléchargement du modèle CSV
├── README.md               # Ce fichier
└── templates/
    ├── header.php          # En-tête avec navigation
    └── footer.php          # Pied de page
```

## Fonctionnalités

- ✅ Authentification locale (email/mot de passe)
- ✅ Protection contre les attaques brute force
- ✅ Gestion des matières premières (CRUD)
- ✅ Gestion des recettes de production
- ✅ Import de recettes depuis CSV
- ✅ Calcul automatique du prix de revient
- ✅ Export PDF des fiches de prix
- ✅ Gestion des frais généraux
- ✅ Tableau de bord avec statistiques

## Format CSV pour l'import

Colonnes attendues (séparateur: point-virgule ou virgule):
- `name` : Nom de la recette
- `description` : Description
- `output_quantity` : Quantité produite
- `output_unit` : Unité de sortie (pièce, kg, L, etc.)
- `ingredient_name` : Nom de l'ingrédient/matière
- `ingredient_quantity` : Quantité de l'ingrédient
- `ingredient_unit` : Unité de l'ingrédient
- `ingredient_price` : Prix unitaire
- `labor_description` : Description du travail
- `labor_hours` : Nombre d'heures
- `labor_rate` : Taux horaire

Exemple:
```csv
name;description;output_quantity;output_unit;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;labor_description;labor_hours;labor_rate
Pain de campagne;Pain traditionnel;10;pièce;Farine de blé;5;kg;1.20;Pétrissage;1;15
```
