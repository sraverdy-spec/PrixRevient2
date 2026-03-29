-- Base de données MySQL pour le Calculateur de Prix de Revient
-- Exécuter ce script pour créer la structure de la base de données

CREATE DATABASE IF NOT EXISTS prix_revient CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prix_revient;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Table des matières premières
CREATE TABLE IF NOT EXISTS raw_materials (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10, 4) NOT NULL,
    supplier VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB;

-- Table des frais généraux
CREATE TABLE IF NOT EXISTS overheads (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    monthly_amount DECIMAL(10, 2) NOT NULL,
    allocation_method ENUM('per_unit', 'per_hour', 'fixed') NOT NULL,
    allocation_value DECIMAL(10, 2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- Table des recettes
CREATE TABLE IF NOT EXISTS recipes (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    output_quantity DECIMAL(10, 4) DEFAULT 1.00,
    output_unit VARCHAR(50) DEFAULT 'pièce',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Table des ingrédients de recette
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id VARCHAR(36) NOT NULL,
    material_id VARCHAR(36) NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
    INDEX idx_recipe (recipe_id)
) ENGINE=InnoDB;

-- Table des coûts de main d'œuvre
CREATE TABLE IF NOT EXISTS recipe_labor_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id VARCHAR(36) NOT NULL,
    description VARCHAR(255) NOT NULL,
    hours DECIMAL(10, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe (recipe_id)
) ENGINE=InnoDB;

-- Table de liaison recettes-frais généraux
CREATE TABLE IF NOT EXISTS recipe_overheads (
    recipe_id VARCHAR(36) NOT NULL,
    overhead_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (recipe_id, overhead_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (overhead_id) REFERENCES overheads(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table des tentatives de connexion (protection brute force)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 1,
    lockout_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (identifier)
) ENGINE=InnoDB;

-- Insertion de l'administrateur par défaut
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'admin')
ON DUPLICATE KEY UPDATE email = email;
-- Mot de passe par défaut: Admin123!

-- Données de démonstration
INSERT INTO raw_materials (id, name, unit, unit_price, supplier, description) VALUES 
(UUID(), 'Farine de blé T55', 'kg', 1.20, 'Moulin du Lac', 'Farine pour boulangerie'),
(UUID(), 'Beurre AOP', 'kg', 8.50, 'Laiterie Centrale', 'Beurre de qualité supérieure'),
(UUID(), 'Sucre en poudre', 'kg', 1.50, 'Sucre SA', 'Sucre blanc raffiné'),
(UUID(), 'Levure boulangère', 'kg', 6.00, 'Lesaffre', 'Levure fraîche'),
(UUID(), 'Sel fin', 'kg', 0.80, 'Sel de Guérande', 'Sel fin de cuisine')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO overheads (id, name, category, monthly_amount, allocation_method, allocation_value) VALUES 
(UUID(), 'Électricité atelier', 'electricity', 450.00, 'per_hour', 160),
(UUID(), 'Loyer local', 'rent', 1200.00, 'per_unit', 500),
(UUID(), 'Amortissement four', 'depreciation', 200.00, 'per_hour', 160)
ON DUPLICATE KEY UPDATE name = name;
