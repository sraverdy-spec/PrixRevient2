<?php
/**
 * Gestion des matières premières
 */
require_once 'config.php';
$user = requireAuth();
$pdo = getDB();

$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;

// Traitement des formulaires
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $unit = trim($_POST['unit'] ?? '');
    $unit_price = floatval($_POST['unit_price'] ?? 0);
    $supplier = trim($_POST['supplier'] ?? '');
    $description = trim($_POST['description'] ?? '');
    
    if ($_POST['action'] === 'create') {
        $newId = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO raw_materials (id, name, unit, unit_price, supplier, description) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$newId, $name, $unit, $unit_price, $supplier, $description]);
        setFlash('success', 'Matière première créée avec succès');
        redirect('materials.php');
    } elseif ($_POST['action'] === 'update') {
        $stmt = $pdo->prepare("UPDATE raw_materials SET name = ?, unit = ?, unit_price = ?, supplier = ?, description = ? WHERE id = ?");
        $stmt->execute([$name, $unit, $unit_price, $supplier, $description, $_POST['id']]);
        setFlash('success', 'Matière première mise à jour');
        redirect('materials.php');
    } elseif ($_POST['action'] === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM raw_materials WHERE id = ?");
        $stmt->execute([$_POST['id']]);
        setFlash('success', 'Matière première supprimée');
        redirect('materials.php');
    }
}

// Récupération des données
$materials = $pdo->query("SELECT * FROM raw_materials ORDER BY name")->fetchAll();
$material = null;
if ($id) {
    $stmt = $pdo->prepare("SELECT * FROM raw_materials WHERE id = ?");
    $stmt->execute([$id]);
    $material = $stmt->fetch();
}

$units = ['kg', 'g', 'L', 'mL', 'pièce', 'm', 'm²', 'unité'];

include 'templates/header.php';
?>

<div class="fade-in">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-extrabold text-zinc-900 tracking-tight">Matières Premières</h1>
            <p class="text-zinc-500 mt-1">Gérez votre catalogue de matières premières</p>
        </div>
        <a href="materials.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
            </svg>
            Ajouter
        </a>
    </div>

    <?php if ($action === 'new' || $action === 'edit'): ?>
        <!-- Form -->
        <div class="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg">
            <h2 class="text-lg font-semibold text-zinc-900 mb-4">
                <?= $action === 'new' ? 'Nouvelle matière première' : 'Modifier la matière' ?>
            </h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="<?= $action === 'new' ? 'create' : 'update' ?>">
                <?php if ($material): ?>
                    <input type="hidden" name="id" value="<?= htmlspecialchars($material['id']) ?>">
                <?php endif; ?>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Nom *</label>
                    <input type="text" name="name" required 
                           value="<?= htmlspecialchars($material['name'] ?? '') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="Ex: Farine de blé">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-zinc-900 mb-1">Unité *</label>
                        <select name="unit" required class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]">
                            <?php foreach ($units as $u): ?>
                                <option value="<?= $u ?>" <?= ($material['unit'] ?? '') === $u ? 'selected' : '' ?>><?= $u ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-900 mb-1">Prix unitaire (€) *</label>
                        <input type="number" name="unit_price" step="0.01" min="0" required 
                               value="<?= htmlspecialchars($material['unit_price'] ?? '') ?>"
                               class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                               placeholder="0.00">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Fournisseur</label>
                    <input type="text" name="supplier" 
                           value="<?= htmlspecialchars($material['supplier'] ?? '') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="Ex: Moulin du Lac">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Description</label>
                    <input type="text" name="description" 
                           value="<?= htmlspecialchars($material['description'] ?? '') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="Description optionnelle">
                </div>
                
                <div class="flex gap-3 pt-4">
                    <a href="materials.php" class="px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
                        Annuler
                    </a>
                    <button type="submit" class="px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                        <?= $action === 'new' ? 'Créer' : 'Mettre à jour' ?>
                    </button>
                </div>
            </form>
        </div>
    <?php else: ?>
        <!-- Table -->
        <?php if (empty($materials)): ?>
            <div class="bg-white border border-zinc-200 rounded-lg p-12 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15Z"/>
                </svg>
                <p class="text-lg font-medium text-zinc-900 mb-1">Aucune matière première</p>
                <p class="text-zinc-500 mb-4">Commencez par ajouter vos matières premières</p>
                <a href="materials.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
                    </svg>
                    Ajouter une matière
                </a>
            </div>
        <?php else: ?>
            <div class="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Nom</th>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Unité</th>
                            <th class="text-right px-4 py-3 font-semibold text-zinc-600">Prix Unitaire</th>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Fournisseur</th>
                            <th class="text-right px-4 py-3 font-semibold text-zinc-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($materials as $mat): ?>
                            <tr class="border-b border-zinc-100 hover:bg-zinc-50">
                                <td class="px-4 py-3 font-medium text-zinc-900"><?= htmlspecialchars($mat['name']) ?></td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                        <?= htmlspecialchars($mat['unit']) ?>
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right font-mono"><?= number_format($mat['unit_price'], 2, ',', ' ') ?> €</td>
                                <td class="px-4 py-3 text-zinc-500"><?= htmlspecialchars($mat['supplier'] ?: '-') ?></td>
                                <td class="px-4 py-3 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <a href="materials.php?action=edit&id=<?= $mat['id'] ?>" 
                                           class="p-2 hover:bg-zinc-100 rounded-md transition-colors">
                                            <svg class="w-4 h-4 text-zinc-600" fill="currentColor" viewBox="0 0 256 256">
                                                <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63Z"/>
                                            </svg>
                                        </a>
                                        <form method="POST" class="inline" onsubmit="return confirm('Supprimer cette matière première ?')">
                                            <input type="hidden" name="action" value="delete">
                                            <input type="hidden" name="id" value="<?= $mat['id'] ?>">
                                            <button type="submit" class="p-2 hover:bg-red-50 rounded-md transition-colors">
                                                <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 256 256">
                                                    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z"/>
                                                </svg>
                                            </button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<?php include 'templates/footer.php'; ?>
