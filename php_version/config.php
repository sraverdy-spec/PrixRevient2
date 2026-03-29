<?php
/**
 * Configuration de la base de données MySQL
 * Calculateur de Prix de Revient
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'prix_revient');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration
define('JWT_SECRET', 'votre_cle_secrete_64_caracteres_minimum_pour_la_securite_jwt_token');
define('JWT_EXPIRY', 3600); // 1 heure

// Session
session_start();

// Connexion PDO
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die("Erreur de connexion: " . $e->getMessage());
        }
    }
    return $pdo;
}

// Fonctions d'authentification
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

function generateToken($userId, $email) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'sub' => $userId,
        'email' => $email,
        'exp' => time() + JWT_EXPIRY,
        'iat' => time()
    ]));
    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = base64_encode($signature);
    return "$header.$payload.$signature";
}

function verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    
    list($header, $payload, $signature) = $parts;
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    
    if ($signature !== $expectedSig) return false;
    
    $data = json_decode(base64_decode($payload), true);
    if ($data['exp'] < time()) return false;
    
    return $data;
}

function getCurrentUser() {
    if (isset($_SESSION['user_id'])) {
        $pdo = getDB();
        $stmt = $pdo->prepare("SELECT id, email, name, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    }
    return null;
}

function requireAuth() {
    $user = getCurrentUser();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

// UUID Generator
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Redirect helper
function redirect($url) {
    header("Location: $url");
    exit;
}

// Flash messages
function setFlash($type, $message) {
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash() {
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}
