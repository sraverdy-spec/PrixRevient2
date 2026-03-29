<?php
/**
 * Gestion des frais généraux
 */
require_once 'config.php';
$user = requireAuth();
$pdo = getDB();

$action = $_GET['action'] ?? 'list';
$id = $_GET['id'] ?? null;

// Traitement des formulaires
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $category = trim($_POST['category'] ?? '');
    $monthly_amount = floatval($_POST['monthly_amount'] ?? 0);
    $allocation_method = trim($_POST['allocation_method'] ?? 'per_unit');
    $allocation_value = floatval($_POST['allocation_value'] ?? 100);
    
    if ($_POST['action'] === 'create') {
        $newId = generateUUID();
        $stmt = $pdo->prepare("INSERT INTO overheads (id, name, category, monthly_amount, allocation_method, allocation_value) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$newId, $name, $category, $monthly_amount, $allocation_method, $allocation_value]);
        setFlash('success', 'Frais général créé avec succès');
        redirect('overheads.php');
    } elseif ($_POST['action'] === 'update') {
        $stmt = $pdo->prepare("UPDATE overheads SET name = ?, category = ?, monthly_amount = ?, allocation_method = ?, allocation_value = ? WHERE id = ?");
        $stmt->execute([$name, $category, $monthly_amount, $allocation_method, $allocation_value, $_POST['id']]);
        setFlash('success', 'Frais général mis à jour');
        redirect('overheads.php');
    } elseif ($_POST['action'] === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM overheads WHERE id = ?");
        $stmt->execute([$_POST['id']]);
        setFlash('success', 'Frais général supprimé');
        redirect('overheads.php');
    }
}

// Récupération des données
$overheads = $pdo->query("SELECT * FROM overheads ORDER BY name")->fetchAll();
$overhead = null;
if ($id) {
    $stmt = $pdo->prepare("SELECT * FROM overheads WHERE id = ?");
    $stmt->execute([$id]);
    $overhead = $stmt->fetch();
}

$categories = [
    'electricity' => 'Électricité',
    'rent' => 'Loyer',
    'depreciation' => 'Amortissement machines',
    'insurance' => 'Assurance',
    'maintenance' => 'Maintenance',
    'utilities' => 'Services publics',
    'other' => 'Autre'
];

$allocationMethods = [
    'per_unit' => 'Par unité produite',
    'per_hour' => 'Par heure de travail',
    'fixed' => 'Montant fixe par produit'
];

include 'templates/header.php';
?>

<div class="fade-in">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-extrabold text-zinc-900 tracking-tight">Frais Généraux</h1>
            <p class="text-zinc-500 mt-1">Configurez les frais généraux à répartir sur vos produits</p>
        </div>
        <a href="overheads.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
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
                <?= $action === 'new' ? 'Nouveau frais général' : 'Modifier le frais' ?>
            </h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="<?= $action === 'new' ? 'create' : 'update' ?>">
                <?php if ($overhead): ?>
                    <input type="hidden" name="id" value="<?= htmlspecialchars($overhead['id']) ?>">
                <?php endif; ?>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Nom *</label>
                    <input type="text" name="name" required 
                           value="<?= htmlspecialchars($overhead['name'] ?? '') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="Ex: Électricité atelier">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Catégorie *</label>
                    <select name="category" required class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]">
                        <?php foreach ($categories as $val => $label): ?>
                            <option value="<?= $val ?>" <?= ($overhead['category'] ?? '') === $val ? 'selected' : '' ?>><?= $label ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Montant mensuel (€) *</label>
                    <input type="number" name="monthly_amount" step="0.01" min="0" required 
                           value="<?= htmlspecialchars($overhead['monthly_amount'] ?? '') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="0.00">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Méthode de répartition *</label>
                    <select name="allocation_method" required class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]">
                        <?php foreach ($allocationMethods as $val => $label): ?>
                            <option value="<?= $val ?>" <?= ($overhead['allocation_method'] ?? '') === $val ? 'selected' : '' ?>><?= $label ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-zinc-900 mb-1">Valeur de répartition (unités ou heures/mois) *</label>
                    <input type="number" name="allocation_value" step="1" min="1" required 
                           value="<?= htmlspecialchars($overhead['allocation_value'] ?? '100') ?>"
                           class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002FA7]"
                           placeholder="100">
                </div>
                
                <div class="flex gap-3 pt-4">
                    <a href="overheads.php" class="px-4 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors font-medium">
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
        <?php if (empty($overheads)): ?>
            <div class="bg-white border border-zinc-200 rounded-lg p-12 text-center">
                <svg class="w-16 h-16 mx-auto mb-4 text-zinc-300" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>
                </svg>
                <p class="text-lg font-medium text-zinc-900 mb-1">Aucun frais général</p>
                <p class="text-zinc-500 mb-4">Ajoutez vos frais fixes pour les inclure dans le calcul des coûts</p>
                <a href="overheads.php?action=new" class="inline-flex items-center gap-2 px-4 py-2 bg-[#002FA7] text-white rounded-md hover:bg-[#002482] transition-colors font-medium">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
                    </svg>
                    Ajouter un frais
                </a>
            </div>
        <?php else: ?>
            <div class="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Nom</th>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Catégorie</th>
                            <th class="text-right px-4 py-3 font-semibold text-zinc-600">Montant Mensuel</th>
                            <th class="text-left px-4 py-3 font-semibold text-zinc-600">Méthode de Répartition</th>
                            <th class="text-right px-4 py-3 font-semibold text-zinc-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($overheads as $oh): ?>
                            <tr class="border-b border-zinc-100 hover:bg-zinc-50">
                                <td class="px-4 py-3 font-medium text-zinc-900"><?= htmlspecialchars($oh['name']) ?></td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                                        <?= $categories[$oh['category']] ?? $oh['category'] ?>
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right font-mono"><?= number_format($oh['monthly_amount'], 2, ',', ' ') ?> €</td>
                                <td class="px-4 py-3 text-zinc-500 text-sm">
                                    <?= $allocationMethods[$oh['allocation_method']] ?? $oh['allocation_method'] ?>
                                    <span class="text-zinc-400">
                                        (<?= $oh['allocation_value'] ?> <?= $oh['allocation_method'] === 'per_hour' ? 'h' : 'u' ?>/mois)
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <a href="overheads.php?action=edit&id=<?= $oh['id'] ?>" 
                                           class="p-2 hover:bg-zinc-100 rounded-md transition-colors">
                                            <svg class="w-4 h-4 text-zinc-600" fill="currentColor" viewBox="0 0 256 256">
                                                <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63Z"/>
                                            </svg>
                                        </a>
                                        <form method="POST" class="inline" onsubmit="return confirm('Supprimer ce frais général ?')">
                                            <input type="hidden" name="action" value="delete">
                                            <input type="hidden" name="id" value="<?= $oh['id'] ?>">
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
