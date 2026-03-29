<?php
/**
 * Détail d'une recette avec gestion des ingrédients et coûts
 */
require_once 'config.php';
$user = requireAuth();
$pdo = getDB();

$id = $_GET['id'] ?? null;
if (!$id) {
    redirect('recipes.php');
}

// Récupérer la recette
$stmt = $pdo->prepare("SELECT * FROM recipes WHERE id = ?");
$stmt->execute([$id]);
$recipe = $stmt->fetch();

if (!$recipe) {
    setFlash('error', 'Recette non trouvée');
    redirect('recipes.php');
}

// Traitement des formulaires
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add_ingredient') {
        $material_id = $_POST['material_id'] ?? '';
        $quantity = floatval($_POST['quantity'] ?? 0);
        if ($material_id && $quantity > 0) {
            $pdo->prepare("INSERT INTO recipe_ingredients (recipe_id, material_id, quantity) VALUES (?, ?, ?)")
                ->execute([$id, $material_id, $quantity]);
            setFlash('success', 'Ingrédient ajouté');
        }
    } elseif ($action === 'remove_ingredient') {
        $ing_id = $_POST['ingredient_id'] ?? '';
        $pdo->prepare("DELETE FROM recipe_ingredients WHERE id = ?")->execute([$ing_id]);
        setFlash('success', 'Ingrédient supprimé');
    } elseif ($action === 'add_labor') {
        $description = trim($_POST['description'] ?? '');
        $hours = floatval($_POST['hours'] ?? 0);
        $hourly_rate = floatval($_POST['hourly_rate'] ?? 0);
        if ($description && $hours > 0 && $hourly_rate > 0) {
            $pdo->prepare("INSERT INTO recipe_labor_costs (recipe_id, description, hours, hourly_rate) VALUES (?, ?, ?, ?)")
                ->execute([$id, $description, $hours, $hourly_rate]);
            setFlash('success', 'Coût main d\'œuvre ajouté');
        }
    } elseif ($action === 'remove_labor') {
        $labor_id = $_POST['labor_id'] ?? '';
        $pdo->prepare("DELETE FROM recipe_labor_costs WHERE id = ?")->execute([$labor_id]);
        setFlash('success', 'Coût supprimé');
    } elseif ($action === 'update_overheads') {
        $overhead_ids = $_POST['overhead_ids'] ?? [];
        $pdo->prepare("DELETE FROM recipe_overheads WHERE recipe_id = ?")->execute([$id]);
        foreach ($overhead_ids as $oh_id) {
            $pdo->prepare("INSERT INTO recipe_overheads (recipe_id, overhead_id) VALUES (?, ?)")
                ->execute([$id, $oh_id]);
        }
        setFlash('success', 'Frais généraux mis à jour');
    } elseif ($action === 'update_recipe') {
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $output_quantity = floatval($_POST['output_quantity'] ?? 1);
        $output_unit = trim($_POST['output_unit'] ?? 'pièce');
        $pdo->prepare("UPDATE recipes SET name = ?, description = ?, output_quantity = ?, output_unit = ? WHERE id = ?")
            ->execute([$name, $description, $output_quantity, $output_unit, $id]);
        setFlash('success', 'Recette mise à jour');
    }
    
    redirect("recipe_detail.php?id=$id");
}

// Récupérer les données
$stmt = $pdo->prepare("
    SELECT ri.*, rm.name, rm.unit, rm.unit_price 
    FROM recipe_ingredients ri 
    JOIN raw_materials rm ON ri.material_id = rm.id 
    WHERE ri.recipe_id = ?
");
$stmt->execute([$id]);
$ingredients = $stmt->fetchAll();

$stmt = $pdo->prepare("SELECT * FROM recipe_labor_costs WHERE recipe_id = ?");
$stmt->execute([$id]);
$laborCosts = $stmt->fetchAll();

$stmt = $pdo->prepare("SELECT overhead_id FROM recipe_overheads WHERE recipe_id = ?");
$stmt->execute([$id]);
$recipeOverheadIds = array_column($stmt->fetchAll(), 'overhead_id');

$allOverheads = $pdo->query("SELECT * FROM overheads ORDER BY name")->fetchAll();
$allMaterials = $pdo->query("SELECT * FROM raw_materials ORDER BY name")->fetchAll();

// Calculs
$totalMaterialCost = 0;
foreach ($ingredients as $ing) {
    $totalMaterialCost += $ing['quantity'] * $ing['unit_price'];
}

$totalLaborCost = 0;
$totalLaborHours = 0;
foreach ($laborCosts as $labor) {
    $totalLaborCost += $labor['hours'] * $labor['hourly_rate'];
    $totalLaborHours += $labor['hours'];
}

$totalOverheadCost = 0;
$overheadDetails = [];
foreach ($allOverheads as $oh) {
    if (in_array($oh['id'], $recipeOverheadIds)) {
        if ($oh['allocation_method'] === 'per_unit') {
            $cost = $oh['monthly_amount'] / max($oh['allocation_value'], 1);
        } elseif ($oh['allocation_method'] === 'per_hour') {
            $cost = ($oh['monthly_amount'] / max($oh['allocation_value'], 1)) * $totalLaborHours;
        } else {
            $cost = $oh['monthly_amount'] / max($oh['allocation_value'], 1);
        }
        $totalOverheadCost += $cost;
        $overheadDetails[] = array_merge($oh, ['calculated_cost' => $cost]);
    }
}

$totalCost = $totalMaterialCost + $totalLaborCost + $totalOverheadCost;
$costPerUnit = $totalCost / max($recipe['output_quantity'], 1);

include 'templates/header.php';
?>

<div class="fade-in">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
            <a href="recipes.php" class="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
                </svg>
            </a>
            <div>
                <h1 class="text-3xl font-extrabold text-zinc-900 tracking-tight"><?= htmlspecialchars($recipe['name']) ?></h1>
                <p class="text-zinc-500 mt-1">
                    Produit: <?= $recipe['output_quantity'] ?> <?= $recipe['output_unit'] ?>
                    <?php if ($recipe['description']): ?>
                        • <?= htmlspecialchars($recipe['description']) ?>
                    <?php endif; ?>
                </p>
            </div>
        </div>
        <a href="export_pdf.php?id=<?= $id ?>" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                <path d="M224,152a8,8,0,0,1-8,8H192v16h16a8,8,0,0,1,0,16H192v16a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8h32A8,8,0,0,1,224,152ZM92,172a28,28,0,0,1-28,28H56v8a8,8,0,0,1-16,0V152a8,8,0,0,1,8-8H64A28,28,0,0,1,92,172Zm-16,0a12,12,0,0,0-12-12H56v24h8A12,12,0,0,0,76,172Zm84,8a36,36,0,0,1-36,36H112a8,8,0,0,1-8-8V152a8,8,0,0,1,8-8h12A36,36,0,0,1,160,180Zm-16,0a20,20,0,0,0-20-20h-4v40h4A20,20,0,0,0,144,180ZM40,112V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Z"/>
            </svg>
            Exporter PDF
        </a>
    </div>

    <!-- Cost Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white border border-zinc-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-[#002FA7]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15Z"/>
                </svg>
                <span class="text-xs font-semibold uppercase text-zinc-500">Matières premières</span>
            </div>
            <div class="text-2xl font-bold text-zinc-900"><?= number_format($totalMaterialCost, 2, ',', ' ') ?> €</div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,40a88,88,0,1,0,88,88A88.1,88.1,0,0,0,128,40Zm0,160a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,200ZM128,72a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V80A8,8,0,0,0,128,72Z"/>
                </svg>
                <span class="text-xs font-semibold uppercase text-zinc-500">Main d'œuvre</span>
            </div>
            <div class="text-2xl font-bold text-zinc-900"><?= number_format($totalLaborCost, 2, ',', ' ') ?> €</div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Z"/>
                </svg>
                <span class="text-xs font-semibold uppercase text-zinc-500">Frais généraux</span>
            </div>
            <div class="text-2xl font-bold text-zinc-900"><?= number_format($totalOverheadCost, 2, ',', ' ') ?> €</div>
        </div>
        <div class="bg-[#002FA7] rounded-lg p-4">
            <span class="text-xs font-semibold uppercase text-blue-200">Prix de revient / unité</span>
            <div class="text-2xl font-bold text-white"><?= number_format($costPerUnit, 2, ',', ' ') ?> €</div>
            <p class="text-xs text-blue-200 mt-1">Total: <?= number_format($totalCost, 2, ',', ' ') ?> €</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            <!-- Ingredients Section -->
            <div class="bg-white border border-zinc-200 rounded-lg">
                <div class="flex items-center justify-between p-4 border-b border-zinc-100">
                    <h3 class="font-semibold text-zinc-900">Ingrédients / Matières premières</h3>
                    <button onclick="document.getElementById('ingredientModal').classList.remove('hidden')" 
                            class="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002FA7] text-white rounded-md text-sm hover:bg-[#002482] transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
                        </svg>
                        Ajouter
                    </button>
                </div>
                <?php if (empty($ingredients)): ?>
                    <div class="p-8 text-center text-zinc-500">
                        <svg class="w-8 h-8 mx-auto mb-2 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15Z"/>
                        </svg>
                        <p>Aucun ingrédient ajouté</p>
                    </div>
                <?php else: ?>
                    <table class="w-full text-sm">
                        <thead class="bg-zinc-50">
                            <tr>
                                <th class="text-left px-4 py-2 font-semibold text-zinc-600">Matière</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Quantité</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Prix/unité</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($ingredients as $ing): 
                                $cost = $ing['quantity'] * $ing['unit_price'];
                            ?>
                            <tr class="border-t border-zinc-100">
                                <td class="px-4 py-2 font-medium"><?= htmlspecialchars($ing['name']) ?></td>
                                <td class="px-4 py-2 text-right"><?= number_format($ing['quantity'], 3, ',', ' ') ?> <?= $ing['unit'] ?></td>
                                <td class="px-4 py-2 text-right font-mono"><?= number_format($ing['unit_price'], 2, ',', ' ') ?> €</td>
                                <td class="px-4 py-2 text-right font-mono font-semibold"><?= number_format($cost, 2, ',', ' ') ?> €</td>
                                <td class="px-4 py-2 text-right">
                                    <form method="POST" class="inline">
                                        <input type="hidden" name="action" value="remove_ingredient">
                                        <input type="hidden" name="ingredient_id" value="<?= $ing['id'] ?>">
                                        <button type="submit" class="p-1 hover:bg-red-50 rounded">
                                            <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 256 256">
                                                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z"/>
                                            </svg>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>

            <!-- Labor Costs Section -->
            <div class="bg-white border border-zinc-200 rounded-lg">
                <div class="flex items-center justify-between p-4 border-b border-zinc-100">
                    <h3 class="font-semibold text-zinc-900">Coûts de main d'œuvre</h3>
                    <button onclick="document.getElementById('laborModal').classList.remove('hidden')" 
                            class="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002FA7] text-white rounded-md text-sm hover:bg-[#002482] transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
                        </svg>
                        Ajouter
                    </button>
                </div>
                <?php if (empty($laborCosts)): ?>
                    <div class="p-8 text-center text-zinc-500">
                        <svg class="w-8 h-8 mx-auto mb-2 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M128,40a88,88,0,1,0,88,88A88.1,88.1,0,0,0,128,40Z"/>
                        </svg>
                        <p>Aucun coût de main d'œuvre</p>
                    </div>
                <?php else: ?>
                    <table class="w-full text-sm">
                        <thead class="bg-zinc-50">
                            <tr>
                                <th class="text-left px-4 py-2 font-semibold text-zinc-600">Description</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Heures</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Taux horaire</th>
                                <th class="text-right px-4 py-2 font-semibold text-zinc-600">Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($laborCosts as $labor): 
                                $cost = $labor['hours'] * $labor['hourly_rate'];
                            ?>
                            <tr class="border-t border-zinc-100">
                                <td class="px-4 py-2 font-medium"><?= htmlspecialchars($labor['description']) ?></td>
                                <td class="px-4 py-2 text-right"><?= number_format($labor['hours'], 2, ',', ' ') ?> h</td>
                                <td class="px-4 py-2 text-right font-mono"><?= number_format($labor['hourly_rate'], 2, ',', ' ') ?> €/h</td>
                                <td class="px-4 py-2 text-right font-mono font-semibold"><?= number_format($cost, 2, ',', ' ') ?> €</td>
                                <td class="px-4 py-2 text-right">
                                    <form method="POST" class="inline">
                                        <input type="hidden" name="action" value="remove_labor">
                                        <input type="hidden" name="labor_id" value="<?= $labor['id'] ?>">
                                        <button type="submit" class="p-1 hover:bg-red-50 rounded">
                                            <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 256 256">
                                                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z"/>
                                            </svg>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>

            <!-- Overheads Section -->
            <div class="bg-white border border-zinc-200 rounded-lg">
                <div class="flex items-center justify-between p-4 border-b border-zinc-100">
                    <h3 class="font-semibold text-zinc-900">Frais généraux affectés</h3>
                    <button onclick="document.getElementById('overheadModal').classList.remove('hidden')" 
                            class="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded-md text-sm hover:bg-zinc-50 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Z"/>
                        </svg>
                        Gérer
                    </button>
                </div>
                <?php if (empty($overheadDetails)): ?>
                    <div class="p-8 text-center text-zinc-500">
                        <svg class="w-8 h-8 mx-auto mb-2 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Z"/>
                        </svg>
                        <p>Aucun frais général affecté</p>
                    </div>
                <?php else: ?>
                    <div class="p-4 space-y-2">
                        <?php foreach ($overheadDetails as $oh): ?>
                        <div class="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                            <div>
                                <p class="font-medium text-zinc-900"><?= htmlspecialchars($oh['name']) ?></p>
                                <p class="text-xs text-zinc-500"><?= $oh['category'] ?> • <?= $oh['allocation_method'] ?></p>
                            </div>
                            <span class="font-mono font-semibold"><?= number_format($oh['calculated_cost'], 2, ',', ' ') ?> €</span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Right Column - Cost Summary -->
        <div class="space-y-6">
            <div class="bg-white border border-zinc-200 rounded-lg p-6">
                <h3 class="font-semibold text-zinc-900 mb-4">Détail des coûts</h3>
                <div class="space-y-3">
                    <div class="flex justify-between p-3 bg-zinc-50 rounded-lg">
                        <span class="text-zinc-600">Matières premières</span>
                        <span class="font-mono font-semibold"><?= number_format($totalMaterialCost, 2, ',', ' ') ?> €</span>
                    </div>
                    <div class="flex justify-between p-3 bg-zinc-50 rounded-lg">
                        <span class="text-zinc-600">Main d'œuvre</span>
                        <span class="font-mono font-semibold"><?= number_format($totalLaborCost, 2, ',', ' ') ?> €</span>
                    </div>
                    <div class="flex justify-between p-3 bg-zinc-50 rounded-lg">
                        <span class="text-zinc-600">Frais généraux</span>
                        <span class="font-mono font-semibold"><?= number_format($totalOverheadCost, 2, ',', ' ') ?> €</span>
                    </div>
                    <div class="flex justify-between p-3 bg-[#002FA7] rounded-lg text-white">
                        <span>Coût total</span>
                        <span class="font-mono font-semibold"><?= number_format($totalCost, 2, ',', ' ') ?> €</span>
                    </div>
                </div>
                <div class="mt-4 p-4 bg-zinc-900 rounded-lg text-center">
                    <p class="text-xs text-zinc-400 uppercase tracking-wider mb-1">Prix de revient unitaire</p>
                    <p class="text-3xl font-bold text-white font-mono"><?= number_format($costPerUnit, 2, ',', ' ') ?> €</p>
                    <p class="text-sm text-zinc-400 mt-1">par <?= $recipe['output_unit'] ?></p>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Add Ingredient Modal -->
<div id="ingredientModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-zinc-900 mb-4">Ajouter un ingrédient</h3>
        <form method="POST" class="space-y-4">
            <input type="hidden" name="action" value="add_ingredient">
            <div>
                <label class="block text-sm font-medium text-zinc-900 mb-1">Matière première *</label>
                <select name="material_id" required class="w-full px-3 py-2 border border-zinc-200 rounded-md">
                    <option value="">Sélectionner</option>
                    <?php foreach ($allMaterials as $mat): ?>
                        <option value="<?= $mat['id'] ?>"><?= htmlspecialchars($mat['name']) ?> (<?= number_format($mat['unit_price'], 2, ',', ' ') ?> €/<?= $mat['unit'] ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-zinc-900 mb-1">Quantité *</label>
                <input type="number" name="quantity" step="0.001" min="0.001" required class="w-full px-3 py-2 border border-zinc-200 rounded-md" placeholder="Ex: 0.5">
            </div>
            <div class="flex gap-3">
                <button type="button" onclick="document.getElementById('ingredientModal').classList.add('hidden')" class="flex-1 px-4 py-2 border border-zinc-200 rounded-md">Annuler</button>
                <button type="submit" class="flex-1 px-4 py-2 bg-[#002FA7] text-white rounded-md">Ajouter</button>
            </div>
        </form>
    </div>
</div>

<!-- Add Labor Modal -->
<div id="laborModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-zinc-900 mb-4">Ajouter un coût de main d'œuvre</h3>
        <form method="POST" class="space-y-4">
            <input type="hidden" name="action" value="add_labor">
            <div>
                <label class="block text-sm font-medium text-zinc-900 mb-1">Description *</label>
                <input type="text" name="description" required class="w-full px-3 py-2 border border-zinc-200 rounded-md" placeholder="Ex: Préparation">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Heures *</label>
                    <input type="number" name="hours" step="0.25" min="0.25" required class="w-full px-3 py-2 border border-zinc-200 rounded-md" placeholder="1.5">
                </div>
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Taux horaire (€) *</label>
                    <input type="number" name="hourly_rate" step="0.01" min="0.01" required class="w-full px-3 py-2 border border-zinc-200 rounded-md" placeholder="15.00">
                </div>
            </div>
            <div class="flex gap-3">
                <button type="button" onclick="document.getElementById('laborModal').classList.add('hidden')" class="flex-1 px-4 py-2 border border-zinc-200 rounded-md">Annuler</button>
                <button type="submit" class="flex-1 px-4 py-2 bg-[#002FA7] text-white rounded-md">Ajouter</button>
            </div>
        </form>
    </div>
</div>

<!-- Manage Overheads Modal -->
<div id="overheadModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-zinc-900 mb-4">Gérer les frais généraux</h3>
        <form method="POST" class="space-y-4">
            <input type="hidden" name="action" value="update_overheads">
            <div class="max-h-64 overflow-y-auto space-y-2">
                <?php foreach ($allOverheads as $oh): ?>
                <label class="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    <input type="checkbox" name="overhead_ids[]" value="<?= $oh['id'] ?>" <?= in_array($oh['id'], $recipeOverheadIds) ? 'checked' : '' ?> class="w-4 h-4">
                    <div>
                        <p class="font-medium text-zinc-900"><?= htmlspecialchars($oh['name']) ?></p>
                        <p class="text-xs text-zinc-500"><?= number_format($oh['monthly_amount'], 2, ',', ' ') ?> €/mois • <?= $oh['category'] ?></p>
                    </div>
                </label>
                <?php endforeach; ?>
                <?php if (empty($allOverheads)): ?>
                    <p class="text-center text-zinc-500 py-4">Aucun frais général. <a href="overheads.php?action=new" class="text-[#002FA7] underline">Créez-en d'abord</a></p>
                <?php endif; ?>
            </div>
            <div class="flex gap-3">
                <button type="button" onclick="document.getElementById('overheadModal').classList.add('hidden')" class="flex-1 px-4 py-2 border border-zinc-200 rounded-md">Annuler</button>
                <button type="submit" class="flex-1 px-4 py-2 bg-[#002FA7] text-white rounded-md">Enregistrer</button>
            </div>
        </form>
    </div>
</div>

<?php include 'templates/footer.php'; ?>
