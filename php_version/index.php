<?php
/**
 * Tableau de bord principal
 */
require_once 'config.php';
$user = requireAuth();
$pdo = getDB();

// Statistiques
$stats = [
    'materials' => $pdo->query("SELECT COUNT(*) FROM raw_materials")->fetchColumn(),
    'recipes' => $pdo->query("SELECT COUNT(*) FROM recipes")->fetchColumn(),
    'overheads' => $pdo->query("SELECT COUNT(*) FROM overheads")->fetchColumn(),
];

// Recettes récentes avec calcul des coûts
$stmt = $pdo->query("
    SELECT r.*, 
           COALESCE(SUM(ri.quantity * rm.unit_price), 0) as material_cost,
           COALESCE((SELECT SUM(hours * hourly_rate) FROM recipe_labor_costs WHERE recipe_id = r.id), 0) as labor_cost
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    LEFT JOIN raw_materials rm ON ri.material_id = rm.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT 5
");
$recentRecipes = $stmt->fetchAll();

// Calcul du coût moyen
$avgCost = 0;
if (count($recentRecipes) > 0) {
    $totalCosts = array_sum(array_map(function($r) {
        $total = $r['material_cost'] + $r['labor_cost'];
        return $total / max($r['output_quantity'], 1);
    }, $recentRecipes));
    $avgCost = $totalCosts / count($recentRecipes);
}

include 'templates/header.php';
?>

<div class="fade-in">
    <!-- Page Header -->
    <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-zinc-900 tracking-tight">Tableau de bord</h1>
        <p class="text-zinc-500 mt-1">Vue d'ensemble du calcul des prix de revient</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Matières Premières</span>
                <svg class="w-6 h-6 text-[#002FA7]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"/>
                </svg>
            </div>
            <div class="text-3xl font-bold text-zinc-900"><?= $stats['materials'] ?></div>
        </div>

        <div class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recettes</span>
                <svg class="w-6 h-6 text-[#10B981]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H48a8,8,0,0,1,0-16H72.54a96.59,96.59,0,0,1-27-40.09A40,40,0,0,1,8,128v-8a8,8,0,0,1,8-8H40V96a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v16h24A8,8,0,0,1,248,120Z"/>
                </svg>
            </div>
            <div class="text-3xl font-bold text-zinc-900"><?= $stats['recipes'] ?></div>
        </div>

        <div class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Frais Généraux</span>
                <svg class="w-6 h-6 text-[#F59E0B]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.6,107.6,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.29,107.29,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Z"/>
                </svg>
            </div>
            <div class="text-3xl font-bold text-zinc-900"><?= $stats['overheads'] ?></div>
        </div>

        <div class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Coût Moyen/Unité</span>
                <svg class="w-6 h-6 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h48a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0V99.31l-58.34,58.35a8,8,0,0,1-11.32,0L104,131.31,48,187.31V200H224A8,8,0,0,1,232,208Z"/>
                </svg>
            </div>
            <div class="text-3xl font-bold text-zinc-900"><?= number_format($avgCost, 2, ',', ' ') ?> €</div>
        </div>
    </div>

    <!-- Charts and Recent Recipes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Chart placeholder -->
        <div class="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 class="font-semibold text-zinc-900 mb-4">Répartition Type des Coûts</h3>
            <div class="h-64 flex items-center justify-center text-zinc-400">
                <div class="text-center">
                    <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm71.87,53.27L136,114.14V40.37A88,88,0,0,1,199.87,77.27ZM120,40.37v83l-71.89,41.5A88,88,0,0,1,120,40.37ZM128,216a88,88,0,0,1-71.87-37.27L207.89,91.07A88,88,0,0,1,128,216Z"/>
                    </svg>
                    <p>Graphique de répartition</p>
                    <p class="text-sm">Matières · Main d'œuvre · Frais généraux</p>
                </div>
            </div>
        </div>

        <!-- Recent Recipes -->
        <div class="bg-white border border-zinc-200 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-zinc-900">Recettes Récentes</h3>
                <a href="recipes.php" class="text-sm text-[#002FA7] hover:underline flex items-center gap-1">
                    Voir tout
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/>
                    </svg>
                </a>
            </div>
            
            <?php if (empty($recentRecipes)): ?>
                <div class="text-center py-8 text-zinc-500">
                    <svg class="w-12 h-12 mx-auto mb-2 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Z"/>
                    </svg>
                    <p class="font-medium">Aucune recette</p>
                    <p class="text-sm mb-4">Créez votre première recette pour voir les coûts</p>
                    <a href="recipes.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors">
                        Créer une recette
                    </a>
                </div>
            <?php else: ?>
                <div class="space-y-3">
                    <?php foreach ($recentRecipes as $recipe): 
                        $totalCost = $recipe['material_cost'] + $recipe['labor_cost'];
                        $costPerUnit = $totalCost / max($recipe['output_quantity'], 1);
                    ?>
                        <a href="recipe_detail.php?id=<?= htmlspecialchars($recipe['id']) ?>" 
                           class="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
                            <div>
                                <p class="font-medium text-zinc-900"><?= htmlspecialchars($recipe['name']) ?></p>
                                <p class="text-sm text-zinc-500"><?= htmlspecialchars($recipe['output_unit']) ?></p>
                            </div>
                            <div class="text-right">
                                <p class="font-mono font-semibold text-zinc-900">
                                    <?= number_format($costPerUnit, 2, ',', ' ') ?> €
                                </p>
                                <p class="text-xs text-zinc-500">par unité</p>
                            </div>
                        </a>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="materials.php" class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md hover:border-[#002FA7] transition-all">
            <svg class="w-8 h-8 text-[#002FA7] mb-3" fill="currentColor" viewBox="0 0 256 256">
                <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15Z"/>
            </svg>
            <h4 class="font-semibold text-zinc-900 mb-1">Gérer les Matières</h4>
            <p class="text-sm text-zinc-500">Ajouter ou modifier les matières premières</p>
        </a>

        <a href="recipes.php?action=new" class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md hover:border-[#10B981] transition-all">
            <svg class="w-8 h-8 text-[#10B981] mb-3" fill="currentColor" viewBox="0 0 256 256">
                <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Z"/>
            </svg>
            <h4 class="font-semibold text-zinc-900 mb-1">Créer une Recette</h4>
            <p class="text-sm text-zinc-500">Définir une nouvelle recette de production</p>
        </a>

        <a href="overheads.php" class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md hover:border-[#F59E0B] transition-all">
            <svg class="w-8 h-8 text-[#F59E0B] mb-3" fill="currentColor" viewBox="0 0 256 256">
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Z"/>
            </svg>
            <h4 class="font-semibold text-zinc-900 mb-1">Configurer les Frais</h4>
            <p class="text-sm text-zinc-500">Paramétrer les frais généraux</p>
        </a>
    </div>
</div>

<?php include 'templates/footer.php'; ?>
