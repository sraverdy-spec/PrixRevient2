<?php
/**
 * Template Header avec navigation
 */
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PrixRevient - Calculateur de Prix de Revient</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'IBM Plex Sans', sans-serif; background-color: #FAFAFA; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Manrope', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .sidebar-link.active { background-color: #002FA7; color: white; }
        .sidebar-link:hover:not(.active) { background-color: #E4E4E7; }
    </style>
</head>
<body class="min-h-screen">
    <div class="flex">
        <!-- Sidebar -->
        <aside class="w-64 bg-zinc-100 border-r border-zinc-200 min-h-screen fixed left-0 top-0 p-4 flex flex-col">
            <div class="text-[#002FA7] font-extrabold text-xl mb-8 p-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM152,96H136V80a8,8,0,0,0-16,0V96H104a8,8,0,0,0,0,16h16v64a8,8,0,0,0,16,0V112h16a8,8,0,0,0,0-16Z"/>
                </svg>
                PrixRevient
            </div>
            
            <nav class="flex-1 space-y-1">
                <?php
                $currentPage = basename($_SERVER['PHP_SELF']);
                $navItems = [
                    ['url' => 'index.php', 'icon' => 'house', 'label' => 'Tableau de bord'],
                    ['url' => 'materials.php', 'icon' => 'package', 'label' => 'Matières premières'],
                    ['url' => 'recipes.php', 'icon' => 'cooking', 'label' => 'Recettes'],
                    ['url' => 'overheads.php', 'icon' => 'gear', 'label' => 'Frais généraux'],
                ];
                
                foreach ($navItems as $item):
                    $isActive = $currentPage === $item['url'] || 
                               ($item['url'] === 'recipes.php' && $currentPage === 'recipe_detail.php');
                ?>
                    <a href="<?= $item['url'] ?>" 
                       class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 font-medium text-sm transition-colors <?= $isActive ? 'active' : '' ?>">
                        <?php if ($item['icon'] === 'house'): ?>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H48V120l80-80,80,80Z"/></svg>
                        <?php elseif ($item['icon'] === 'package'): ?>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256"><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15Z"/></svg>
                        <?php elseif ($item['icon'] === 'cooking'): ?>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256"><path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Z"/></svg>
                        <?php elseif ($item['icon'] === 'gear'): ?>
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/></svg>
                        <?php endif; ?>
                        <?= $item['label'] ?>
                    </a>
                <?php endforeach; ?>
            </nav>
            
            <!-- User section -->
            <div class="mt-auto border-t border-zinc-200 pt-4">
                <div class="flex items-center gap-3 px-3 py-2 mb-2">
                    <div class="w-8 h-8 rounded-full bg-[#002FA7] flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,16a88,88,0,0,1,73.72,40H54.28A88,88,0,0,1,128,40Zm0,176a88,88,0,0,1-73.72-40H201.72A88,88,0,0,1,128,216Z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-zinc-900 truncate"><?= htmlspecialchars($user['name']) ?></p>
                        <p class="text-xs text-zinc-500 truncate"><?= htmlspecialchars($user['email']) ?></p>
                    </div>
                </div>
                <a href="logout.php" class="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z"/>
                    </svg>
                    Déconnexion
                </a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 ml-64 p-8">
            <?php 
            $flash = getFlash();
            if ($flash): 
            ?>
                <div class="mb-4 p-4 rounded-lg <?= $flash['type'] === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700' ?>">
                    <?= htmlspecialchars($flash['message']) ?>
                </div>
            <?php endif; ?>
