<?php
/**
 * Génération du PDF de prix de revient
 */
require_once 'config.php';
require_once 'vendor/autoload.php'; // Nécessite TCPDF ou FPDF

$user = requireAuth();
$pdo = getDB();

$id = $_GET['id'] ?? null;
if (!$id) {
    die('ID de recette manquant');
}

// Récupérer la recette
$stmt = $pdo->prepare("SELECT * FROM recipes WHERE id = ?");
$stmt->execute([$id]);
$recipe = $stmt->fetch();

if (!$recipe) {
    die('Recette non trouvée');
}

// Ingrédients
$stmt = $pdo->prepare("
    SELECT ri.*, rm.name, rm.unit, rm.unit_price 
    FROM recipe_ingredients ri 
    JOIN raw_materials rm ON ri.material_id = rm.id 
    WHERE ri.recipe_id = ?
");
$stmt->execute([$id]);
$ingredients = $stmt->fetchAll();

// Main d'œuvre
$stmt = $pdo->prepare("SELECT * FROM recipe_labor_costs WHERE recipe_id = ?");
$stmt->execute([$id]);
$laborCosts = $stmt->fetchAll();

// Frais généraux
$stmt = $pdo->prepare("
    SELECT o.* FROM overheads o 
    JOIN recipe_overheads ro ON o.id = ro.overhead_id 
    WHERE ro.recipe_id = ?
");
$stmt->execute([$id]);
$overheads = $stmt->fetchAll();

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
foreach ($overheads as $oh) {
    if ($oh['allocation_method'] === 'per_unit') {
        $totalOverheadCost += $oh['monthly_amount'] / max($oh['allocation_value'], 1);
    } elseif ($oh['allocation_method'] === 'per_hour') {
        $totalOverheadCost += ($oh['monthly_amount'] / max($oh['allocation_value'], 1)) * $totalLaborHours;
    } else {
        $totalOverheadCost += $oh['monthly_amount'] / max($oh['allocation_value'], 1);
    }
}

$totalCost = $totalMaterialCost + $totalLaborCost + $totalOverheadCost;
$costPerUnit = $totalCost / max($recipe['output_quantity'], 1);

// Génération HTML pour impression/PDF
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Prix de Revient - <?= htmlspecialchars($recipe['name']) ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { text-align: center; color: #002FA7; font-size: 24px; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
        .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        h2 { color: #002FA7; font-size: 14px; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #002FA7; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #002FA7; color: white; font-weight: bold; }
        .text-right { text-align: right; }
        .subtotal { background: #f5f5f5; font-weight: bold; }
        .total-box { background: #002FA7; color: white; padding: 20px; border-radius: 5px; margin-top: 30px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .total-final { font-size: 24px; font-weight: bold; border-top: 2px solid rgba(255,255,255,0.3); padding-top: 15px; margin-top: 15px; }
        .print-btn { position: fixed; top: 20px; right: 20px; background: #002FA7; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        @media print { .print-btn { display: none; } body { padding: 20px; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
    
    <h1>FICHE DE PRIX DE REVIENT</h1>
    <p class="subtitle">Généré le <?= date('d/m/Y à H:i') ?></p>
    
    <div class="info-box">
        <div class="info-row">
            <span><strong>Produit:</strong> <?= htmlspecialchars($recipe['name']) ?></span>
            <span><strong>Quantité produite:</strong> <?= $recipe['output_quantity'] ?> <?= $recipe['output_unit'] ?></span>
        </div>
        <?php if ($recipe['description']): ?>
            <div class="info-row">
                <span><strong>Description:</strong> <?= htmlspecialchars($recipe['description']) ?></span>
            </div>
        <?php endif; ?>
    </div>
    
    <?php if (!empty($ingredients)): ?>
    <h2>1. MATIÈRES PREMIÈRES</h2>
    <table>
        <thead>
            <tr>
                <th>Matière</th>
                <th class="text-right">Quantité</th>
                <th class="text-right">Prix unitaire</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($ingredients as $ing): 
                $cost = $ing['quantity'] * $ing['unit_price'];
            ?>
            <tr>
                <td><?= htmlspecialchars($ing['name']) ?></td>
                <td class="text-right"><?= number_format($ing['quantity'], 3, ',', ' ') ?> <?= $ing['unit'] ?></td>
                <td class="text-right"><?= number_format($ing['unit_price'], 2, ',', ' ') ?> €</td>
                <td class="text-right"><?= number_format($cost, 2, ',', ' ') ?> €</td>
            </tr>
            <?php endforeach; ?>
            <tr class="subtotal">
                <td colspan="3">Sous-total matières premières</td>
                <td class="text-right"><?= number_format($totalMaterialCost, 2, ',', ' ') ?> €</td>
            </tr>
        </tbody>
    </table>
    <?php endif; ?>
    
    <?php if (!empty($laborCosts)): ?>
    <h2>2. MAIN D'ŒUVRE</h2>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Heures</th>
                <th class="text-right">Taux horaire</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($laborCosts as $labor): 
                $cost = $labor['hours'] * $labor['hourly_rate'];
            ?>
            <tr>
                <td><?= htmlspecialchars($labor['description']) ?></td>
                <td class="text-right"><?= number_format($labor['hours'], 2, ',', ' ') ?> h</td>
                <td class="text-right"><?= number_format($labor['hourly_rate'], 2, ',', ' ') ?> €/h</td>
                <td class="text-right"><?= number_format($cost, 2, ',', ' ') ?> €</td>
            </tr>
            <?php endforeach; ?>
            <tr class="subtotal">
                <td colspan="3">Sous-total main d'œuvre</td>
                <td class="text-right"><?= number_format($totalLaborCost, 2, ',', ' ') ?> €</td>
            </tr>
        </tbody>
    </table>
    <?php endif; ?>
    
    <?php if (!empty($overheads)): ?>
    <h2>3. FRAIS GÉNÉRAUX</h2>
    <table>
        <thead>
            <tr>
                <th>Frais</th>
                <th>Catégorie</th>
                <th>Méthode</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($overheads as $oh): 
                if ($oh['allocation_method'] === 'per_unit') {
                    $cost = $oh['monthly_amount'] / max($oh['allocation_value'], 1);
                } elseif ($oh['allocation_method'] === 'per_hour') {
                    $cost = ($oh['monthly_amount'] / max($oh['allocation_value'], 1)) * $totalLaborHours;
                } else {
                    $cost = $oh['monthly_amount'] / max($oh['allocation_value'], 1);
                }
            ?>
            <tr>
                <td><?= htmlspecialchars($oh['name']) ?></td>
                <td><?= htmlspecialchars($oh['category']) ?></td>
                <td><?= htmlspecialchars($oh['allocation_method']) ?></td>
                <td class="text-right"><?= number_format($cost, 2, ',', ' ') ?> €</td>
            </tr>
            <?php endforeach; ?>
            <tr class="subtotal">
                <td colspan="3">Sous-total frais généraux</td>
                <td class="text-right"><?= number_format($totalOverheadCost, 2, ',', ' ') ?> €</td>
            </tr>
        </tbody>
    </table>
    <?php endif; ?>
    
    <div class="total-box">
        <div class="total-row">
            <span>Coût des matières premières</span>
            <span><?= number_format($totalMaterialCost, 2, ',', ' ') ?> €</span>
        </div>
        <div class="total-row">
            <span>Coût de main d'œuvre</span>
            <span><?= number_format($totalLaborCost, 2, ',', ' ') ?> €</span>
        </div>
        <div class="total-row">
            <span>Frais généraux</span>
            <span><?= number_format($totalOverheadCost, 2, ',', ' ') ?> €</span>
        </div>
        <div class="total-row total-final">
            <span>COÛT TOTAL</span>
            <span><?= number_format($totalCost, 2, ',', ' ') ?> €</span>
        </div>
        <div class="total-row total-final" style="font-size: 28px;">
            <span>PRIX DE REVIENT / <?= $recipe['output_unit'] ?></span>
            <span><?= number_format($costPerUnit, 2, ',', ' ') ?> €</span>
        </div>
    </div>
</body>
</html>
