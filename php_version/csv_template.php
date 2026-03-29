<?php
/**
 * Téléchargement du template CSV
 */
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=template_recettes.csv');

// BOM pour Excel
echo "\xEF\xBB\xBF";

echo "name;description;output_quantity;output_unit;ingredient_name;ingredient_quantity;ingredient_unit;ingredient_price;labor_description;labor_hours;labor_rate\n";
echo "Pain de campagne;Pain traditionnel;10;pièce;Farine de blé;5;kg;1.20;Pétrissage;1;15\n";
echo "Pain de campagne;Pain traditionnel;10;pièce;Levure;0.1;kg;8.00;Cuisson;0.5;15\n";
echo "Pain de campagne;Pain traditionnel;10;pièce;Sel;0.05;kg;0.50;;;\n";
echo "Croissant;Viennoiserie;20;pièce;Farine;2;kg;1.20;Préparation;2;15\n";
echo "Croissant;Viennoiserie;20;pièce;Beurre;1;kg;8.50;Cuisson;0.5;15\n";
