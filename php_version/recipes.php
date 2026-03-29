<?php
/**
 * Gestion des recettes - Liste et création
 */
require_once 'config.php';
$user = requireAuth();
$pdo = getDB();

$action = $_GET['action'] ?? 'list';

// Traitement des formulaires
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($_POST['action'] === 'create') {
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $output_quantity = floatval($_POST['output_quantity'] ?? 1);
        $output_unit = trim($_POST['output_unit'] ?? 'pièce');
        
        $newId = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO recipes (id, user_id, name, description, output_quantity, output_unit) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$newId, $user['id'], $name, $description, $output_quantity, $output_unit]);
        
        setFlash('success', 'Recette créée avec succès');
        redirect("recipe_detail.php?id=$newId");
    } elseif ($_POST['action'] === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM recipes WHERE id = ?");
        $stmt->execute([$_POST['id']]);
        setFlash('success', 'Recette supprimée');
        redirect('recipes.php');
    } elseif ($_POST['action'] === 'import_csv') {
        // Import CSV
        if (isset($_FILES['csv_file']) && $_FILES['csv_file']['error'] === UPLOAD_ERR_OK) {
            $content = file_get_contents($_FILES['csv_file']['tmp_name']);
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content); // Remove BOM
            
            $lines = explode("\n", $content);
            $header = str_getcsv(array_shift($lines), ';');
            if (count($header) <= 1) {
                $header = str_getcsv($lines[0] ?? '', ',');
                $lines = array_slice(explode("\n", $content), 1);
            }
            
            $header = array_map(function($h) {
                return strtolower(trim($h));
            }, $header);
            
            $recipesData = [];
            $importedCount = 0;
            
            foreach ($lines as $line) {
                if (empty(trim($line))) continue;
                
                $values = str_getcsv($line, ';');
                if (count($values) <= 1) {
                    $values = str_getcsv($line, ',');
                }
                
                $row = array_combine($header, array_pad($values, count($header), ''));
                
                $recipeName = trim($row['name'] ?? $row['nom'] ?? '');
                if (empty($recipeName)) continue;
                
                if (!isset($recipesData[$recipeName])) {
                    $recipesData[$recipeName] = [
                        'name' => $recipeName,
                        'description' => $row['description'] ?? '',
                        'output_quantity' => floatval($row['output_quantity'] ?? $row['quantite_produite'] ?? 1),
                        'output_unit' => $row['output_unit'] ?? $row['unite_sortie'] ?? 'pièce',
                        'ingredients' => [],
                        'labor_costs' => []
                    ];
                }
                
                // Ingrédient
                $ingName = trim($row['ingredient_name'] ?? $row['matiere'] ?? $row['ingredient'] ?? '');
                $ingQty = trim($row['ingredient_quantity'] ?? $row['quantite'] ?? $row['qte'] ?? '');
                
                if (!empty($ingName) && !empty($ingQty)) {
                    $ingUnit = $row['ingredient_unit'] ?? $row['unite'] ?? 'unité';
                    $ingPrice = floatval(str_replace(',', '.', $row['ingredient_price'] ?? $row['prix_unitaire'] ?? $row['prix'] ?? 0));
                    
                    // Créer la matière si elle n'existe pas
                    $stmt = $pdo->prepare("SELECT id, unit, unit_price FROM raw_materials WHERE name = ?");
                    $stmt->execute([$ingName]);
                    $existingMat = $stmt->fetch();
                    
                    if (!$existingMat) {
                        $matId = generateUUID();
                        $pdo->prepare("INSERT INTO raw_materials (id, name, unit, unit_price) VALUES (?, ?, ?, ?)")
                            ->execute([$matId, $ingName, $ingUnit, $ingPrice]);
                    } else {
                        $matId = $existingMat['id'];
                    }
                    
                    $recipesData[$recipeName]['ingredients'][] = [
                        'material_id' => $matId,
                        'quantity' => floatval(str_replace(',', '.', $ingQty))
                    ];
                }
                
                // Main d'œuvre
                $laborDesc = trim($row['labor_description'] ?? $row['travail'] ?? $row['main_oeuvre'] ?? '');
                $laborHours = trim($row['labor_hours'] ?? $row['heures'] ?? '');
                
                if (!empty($laborDesc) && !empty($laborHours)) {
                    $laborRate = floatval(str_replace(',', '.', $row['labor_rate'] ?? $row['taux_horaire'] ?? $row['taux'] ?? 15));
                    $recipesData[$recipeName]['labor_costs'][] = [
                        'description' => $laborDesc,
                        'hours' => floatval(str_replace(',', '.', $laborHours)),
                        'hourly_rate' => $laborRate
                    ];
                }
            }
            
            // Sauvegarder les recettes
            foreach ($recipesData as $data) {
                $recipeId = generateUUID();
                $pdo->prepare("INSERT INTO recipes (id, user_id, name, description, output_quantity, output_unit) VALUES (?, ?, ?, ?, ?, ?)")
                    ->execute([$recipeId, $user['id'], $data['name'], $data['description'], $data['output_quantity'], $data['output_unit']]);
                
                foreach ($data['ingredients'] as $ing) {
                    $pdo->prepare("INSERT INTO recipe_ingredients (recipe_id, material_id, quantity) VALUES (?, ?, ?)")
                        ->execute([$recipeId, $ing['material_id'], $ing['quantity']]);
                }
                
                foreach ($data['labor_costs'] as $labor) {
                    $pdo->prepare("INSERT INTO recipe_labor_costs (recipe_id, description, hours, hourly_rate) VALUES (?, ?, ?, ?)")
                        ->execute([$recipeId, $labor['description'], $labor['hours'], $labor['hourly_rate']]);
                }
                
                $importedCount++;
            }
            
            setFlash('success', "$importedCount recette(s) importée(s) avec succès");
            redirect('recipes.php');
        } else {
            setFlash('error', 'Erreur lors du téléchargement du fichier');
            redirect('recipes.php');
        }
    }
}

// Récupération des recettes avec calcul des coûts
$recipes = $pdo->query("
    SELECT r.*, 
           COALESCE(SUM(ri.quantity * rm.unit_price), 0) as material_cost,
           COALESCE((SELECT SUM(hours * hourly_rate) FROM recipe_labor_costs WHERE recipe_id = r.id), 0) as labor_cost,
           (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredients_count,
           (SELECT COUNT(*) FROM recipe_labor_costs WHERE recipe_id = r.id) as labor_count
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    LEFT JOIN raw_materials rm ON ri.material_id = rm.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
")->fetchAll();

$outputUnits = ['pièce', 'kg', 'L', 'unité', 'lot', 'boîte'];

include 'templates/header.php';
?>

<div class="fade-in">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-extrabold text-zinc-900 tracking-tight">Recettes de Production</h1>
            <p class="text-zinc-500 mt-1">Définissez vos recettes et calculez les prix de revient</p>
        </div>
        <div class="flex gap-3">
            <button onclick="document.getElementById('importModal').classList.remove('hidden')" 
                    class="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H200V144a8,8,0,0,1,16,0ZM93.66,77.66,120,51.31V144a8,8,0,0,0,16,0V51.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,77.66Z"/>
                </svg>
                Importer CSV
            </button>
            <a href="recipes.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
                </svg>
                Nouvelle recette
            </a>
        </div>
    </div>

    <?php if ($action === 'new'): ?>
        <!-- Form -->
        <div class="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg">
            <h2 class="text-lg font-semibold text-zinc-900 mb-4">Nouvelle recette</h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="create">
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Nom de la recette *</label>
                    <input type="text" name="name" required 
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="Ex: Pain de campagne">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Description</label>
                    <textarea name="description" rows="3"
                              class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                              placeholder="Description de la recette..."></textarea>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-900 mb-1">Quantité produite *</label>
                        <input type="number" name="output_quantity" step="0.01" min="0.01" value="1" required 
                               class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-900 mb-1">Unité de sortie *</label>
                        <select name="output_unit" required class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]">
                            <?php foreach ($outputUnits as $u): ?>
                                <option value="<?= $u ?>"><?= ucfirst($u) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <a href="recipes.php" class="px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
                        Annuler
                    </a>
                    <button type="submit" class="px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                        Créer et configurer
                    </button>
                </div>
            </form>
        </div>
    <?php else: ?>
        <!-- Grid -->
        <?php if (empty($recipes)): ?>
            <div class="bg-white border border-zinc-200 rounded-lg p-12 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Z"/>
                </svg>
                <p class="text-lg font-medium text-zinc-900 mb-1">Aucune recette</p>
                <p class="text-zinc-500 mb-4">Créez votre première recette de production ou importez depuis un CSV</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="document.getElementById('importModal').classList.remove('hidden')" 
                            class="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
                        Importer CSV
                    </button>
                    <a href="recipes.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                        Créer une recette
                    </a>
                </div>
            </div>
        <?php else: ?>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <?php foreach ($recipes as $recipe): 
                    $totalCost = $recipe['material_cost'] + $recipe['labor_cost'];
                    $costPerUnit = $totalCost / max($recipe['output_quantity'], 1);
                ?>
                    <div class="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-4">
                            <div>
                                <h3 class="font-semibold text-zinc-900 text-lg"><?= htmlspecialchars($recipe['name']) ?></h3>
                                <p class="text-sm text-zinc-500 mt-1">
                                    <?= $recipe['output_quantity'] ?> <?= $recipe['output_unit'] ?>
                                </p>
                            </div>
                            <div class="flex gap-1">
                                <a href="recipe_detail.php?id=<?= $recipe['id'] ?>&action=edit" 
                                   class="p-2 hover:bg-zinc-100 rounded-md transition-colors">
                                    <svg class="w-4 h-4 text-zinc-600" fill="currentColor" viewBox="0 0 256 256">
                                        <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63Z"/>
                                    </svg>
                                </a>
                                <form method="POST" class="inline" onsubmit="return confirm('Supprimer cette recette ?')">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="id" value="<?= $recipe['id'] ?>">
                                    <button type="submit" class="p-2 hover:bg-red-50 rounded-md transition-colors">
                                        <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z"/>
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>

                        <?php if ($recipe['description']): ?>
                            <p class="text-sm text-zinc-600 mb-4 line-clamp-2"><?= htmlspecialchars($recipe['description']) ?></p>
                        <?php endif; ?>

                        <div class="flex items-center gap-4 text-sm text-zinc-500 pt-4 border-t border-zinc-100">
                            <span><?= $recipe['ingredients_count'] ?> ingrédients</span>
                            <span><?= $recipe['labor_count'] ?> main d'œuvre</span>
                        </div>

                        <div class="mt-4 p-3 bg-zinc-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-zinc-600">Prix de revient</span>
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-[#002FA7]" fill="currentColor" viewBox="0 0 256 256">
                                        <path d="M176,112H152a8,8,0,0,0,0,16h16v16H144a8,8,0,0,0,0,16h24v16a8,8,0,0,0,16,0V160h16a8,8,0,0,0,0-16H184V128h16a8,8,0,0,0,0-16H176Z"/>
                                    </svg>
                                    <span class="font-mono font-bold text-[#002FA7] text-lg">
                                        <?= number_format($costPerUnit, 2, ',', ' ') ?> €
                                    </span>
                                </div>
                            </div>
                            <p class="text-xs text-zinc-400 mt-1">par <?= $recipe['output_unit'] ?></p>
                        </div>

                        <a href="recipe_detail.php?id=<?= $recipe['id'] ?>" 
                           class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium text-sm">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/>
                            </svg>
                            Voir les détails
                        </a>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<!-- Import CSV Modal -->
<div id="importModal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-zinc-900 mb-4">Importer des recettes depuis un fichier CSV</h3>
        
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p class="text-sm text-blue-800 font-medium mb-1">Format du fichier CSV</p>
            <p class="text-xs text-blue-700">
                Colonnes: name, description, output_quantity, output_unit, ingredient_name, ingredient_quantity, ingredient_unit, ingredient_price, labor_description, labor_hours, labor_rate
            </p>
            <p class="text-xs text-blue-600 mt-1">Séparateur: point-virgule (;) ou virgule (,)</p>
        </div>
        
        <div class="text-center mb-4">
            <a href="csv_template.php" class="inline-flex items-center gap-2 text-sm text-[#002FA7] hover:underline">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H200V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"/>
                </svg>
                Télécharger le modèle CSV
            </a>
        </div>
        
        <form method="POST" enctype="multipart/form-data">
            <input type="hidden" name="action" value="import_csv">
            <div class="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center mb-4">
                <input type="file" name="csv_file" accept=".csv" required class="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#002FA7] file:text-white hover:file:bg-[#002482]">
            </div>
            
            <div class="flex gap-3">
                <button type="button" onclick="document.getElementById('importModal').classList.add('hidden')" 
                        class="flex-1 px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
                    Annuler
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                    Importer
                </button>
            </div>
        </form>
    </div>
</div>

<?php include 'templates/footer.php'; ?>
