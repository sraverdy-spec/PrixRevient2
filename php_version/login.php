<?php
/**
 * Page de connexion et d'inscription
 */
require_once 'config.php';

$error = '';
$success = '';
$mode = $_GET['mode'] ?? 'login';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pdo = getDB();
    
    if ($mode === 'register') {
        $name = trim($_POST['name'] ?? '');
        $email = strtolower(trim($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';
        
        if (empty($name) || empty($email) || empty($password)) {
            $error = "Tous les champs sont obligatoires";
        } else {
            // Vérifier si l'email existe
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $error = "Cet email est déjà utilisé";
            } else {
                $hash = hashPassword($password);
                $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'user')");
                $stmt->execute([$email, $hash, $name]);
                
                $_SESSION['user_id'] = $pdo->lastInsertId();
                redirect('index.php');
            }
        }
    } else {
        $email = strtolower(trim($_POST['email'] ?? ''));
        $password = $_POST['password'] ?? '';
        
        // Protection brute force
        $ip = $_SERVER['REMOTE_ADDR'];
        $identifier = "$ip:$email";
        
        $stmt = $pdo->prepare("SELECT * FROM login_attempts WHERE identifier = ?");
        $stmt->execute([$identifier]);
        $attempts = $stmt->fetch();
        
        if ($attempts && $attempts['attempt_count'] >= 5 && strtotime($attempts['lockout_until']) > time()) {
            $error = "Compte temporairement bloqué. Réessayez dans 15 minutes.";
        } else {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if ($user && verifyPassword($password, $user['password_hash'])) {
                // Connexion réussie
                $pdo->prepare("DELETE FROM login_attempts WHERE identifier = ?")->execute([$identifier]);
                $_SESSION['user_id'] = $user['id'];
                redirect('index.php');
            } else {
                // Échec de connexion
                if ($attempts) {
                    $pdo->prepare("UPDATE login_attempts SET attempt_count = attempt_count + 1, lockout_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE identifier = ?")
                        ->execute([$identifier]);
                } else {
                    $pdo->prepare("INSERT INTO login_attempts (identifier, lockout_until) VALUES (?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))")
                        ->execute([$identifier]);
                }
                $error = "Email ou mot de passe incorrect";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $mode === 'register' ? 'Inscription' : 'Connexion' ?> - PrixRevient</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'IBM Plex Sans', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Manrope', sans-serif; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-2 text-[#002FA7]">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM152,96H136V80a8,8,0,0,0-16,0V96H104a8,8,0,0,0,0,16h16v64a8,8,0,0,0,16,0V112h16a8,8,0,0,0,0-16Z"/>
                </svg>
                <span class="text-2xl font-extrabold">PrixRevient</span>
            </div>
            <p class="text-zinc-500 mt-2">Calculateur de prix de revient</p>
        </div>

        <!-- Card -->
        <div class="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm">
            <h2 class="text-xl font-semibold text-zinc-900 mb-6 text-center">
                <?= $mode === 'register' ? 'Créer un compte' : 'Connexion' ?>
            </h2>

            <?php if ($error): ?>
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form method="POST" class="space-y-4">
                <?php if ($mode === 'register'): ?>
                    <div>
                        <label class="block text-sm font-medium text-zinc-900 mb-1">Nom complet</label>
                        <input type="text" name="name" required 
                               class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                               placeholder="Jean Dupont">
                    </div>
                <?php endif; ?>

                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Email</label>
                    <input type="email" name="email" required 
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="vous@exemple.com">
                </div>

                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Mot de passe</label>
                    <input type="password" name="password" required 
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="••••••••">
                </div>

                <button type="submit" 
                        class="w-full py-2 px-4 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                    <?= $mode === 'register' ? 'Créer le compte' : 'Se connecter' ?>
                </button>
            </form>

            <div class="mt-6 text-center">
                <?php if ($mode === 'register'): ?>
                    <a href="login.php" class="text-sm text-[#002FA7] hover:underline">
                        Déjà un compte ? Se connecter
                    </a>
                <?php else: ?>
                    <a href="login.php?mode=register" class="text-sm text-[#002FA7] hover:underline">
                        Pas de compte ? Créer un compte
                    </a>
                <?php endif; ?>
            </div>
        </div>

        <!-- Demo credentials -->
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p class="font-medium text-blue-900 mb-1">Compte de démonstration :</p>
            <p class="text-blue-700">Email: admin@example.com</p>
            <p class="text-blue-700">Mot de passe: Admin123!</p>
        </div>
    </div>
</body>
</html>
