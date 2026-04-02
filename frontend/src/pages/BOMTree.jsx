import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TreeStructure, CookingPot, Eye, UploadSimple, DownloadSimple, FileText, CaretRight, CaretDown, Package, Cube, Calculator } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Pure function outside component - no JSX, no Babel traversal issue
function buildFlatList(recipe, allRecipes, expandedIds, depth) {
  var rows = [];
  var subs = (recipe.ingredients || []).filter(function(i) { return i.is_sub_recipe; });
  var raws = (recipe.ingredients || []).filter(function(i) { return !i.is_sub_recipe; });
  var labors = recipe.labor_costs || [];
  var hasChildren = subs.length + raws.length + labors.length > 0;
  var isOpen = expandedIds[recipe.id];

  rows.push({ type: "recipe", recipe: recipe, depth: depth, hasChildren: hasChildren, isOpen: isOpen, subsCount: subs.length, rawsCount: raws.length, laborsCount: labors.length });

  if (isOpen && hasChildren && depth < 6) {
    for (var si = 0; si < subs.length; si++) {
      var sub = null;
      for (var j = 0; j < allRecipes.length; j++) {
        if (allRecipes[j].id === subs[si].sub_recipe_id) { sub = allRecipes[j]; break; }
      }
      if (sub) {
        var subRows = buildFlatList(sub, allRecipes, expandedIds, depth + 1);
        for (var k = 0; k < subRows.length; k++) rows.push(subRows[k]);
      } else {
        rows.push({ type: "missing", name: subs[si].material_name, depth: depth + 1 });
      }
    }
    for (var ri = 0; ri < raws.length; ri++) {
      rows.push({ type: "raw", ingredient: raws[ri], depth: depth + 1 });
    }
    for (var li = 0; li < labors.length; li++) {
      rows.push({ type: "labor", labor: labors[li], depth: depth + 1 });
    }
  }
  return rows;
}

export default function BOMTree() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});
  const [costPopup, setCostPopup] = useState(null);
  const [costLoading, setCostLoading] = useState(false);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetchRecipes();
    axios.get(API + "/materials").then(r => setMaterials(r.data)).catch(() => {});
  }, []);

  const fetchRecipes = () => {
    axios.get(API + "/recipes")
      .then(res => setRecipes(res.data))
      .catch(() => toast.error("Erreur"))
      .finally(() => setLoading(false));
  };

  const toggleAll = (expand) => {
    const ids = {};
    recipes.forEach(r => { ids[r.id] = expand; });
    setExpandedIds(ids);
  };

  const toggle = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCostPopup = async (recipeId) => {
    setCostLoading(true);
    setCostPopup(null);
    try {
      const res = await axios.get(API + "/recipes/" + recipeId + "/cost");
      setCostPopup(res.data);
    } catch {
      toast.error("Erreur de calcul");
    } finally {
      setCostLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const response = await axios.post(API + "/recipes/import-bom-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (response.data.success) {
        toast.success(response.data.imported_count + " recette(s) importee(s)");
        fetchRecipes();
      }
      setIsImportDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const topLevel = recipes.filter(r => !r.is_intermediate);
  const intermediate = recipes.filter(r => r.is_intermediate);
  const getCode = (materialId) => {
    const m = materials.find(x => x.id === materialId);
    return m?.code_article || "";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;
  }

  const renderRow = (row, idx) => {
    const ml = row.depth * 28;

    if (row.type === "recipe") {
      const r = row.recipe;
      const isRoot = row.depth === 0;
      const bg = isRoot
        ? "bg-gradient-to-r from-[#002FA7] to-[#1a47c2] text-white border-[#002FA7] shadow-md"
        : r.is_intermediate
          ? "bg-amber-50 border-amber-300"
          : "bg-white border-zinc-200 hover:border-zinc-400";
      const summary = row.rawsCount + " mat. | " + row.subsCount + " sous-rec. | " + row.laborsCount + " MO";

      return (
        <div key={r.id + "-" + row.depth + "-" + idx} style={{ marginLeft: ml }}
          className={"flex items-center gap-2 py-2.5 px-4 my-1 rounded-lg border cursor-pointer transition-all " + bg}
          onClick={() => row.hasChildren && toggle(r.id)}
          data-testid={"bom-node-" + r.id}
        >
          {/* Connector dot */}
          {!isRoot && <div className="w-2 h-2 rounded-full bg-zinc-300 shrink-0 -ml-6" />}

          {row.hasChildren ? (
            row.isOpen
              ? <CaretDown size={14} weight="bold" className={isRoot ? "text-white/80" : "text-zinc-400"} />
              : <CaretRight size={14} weight="bold" className={isRoot ? "text-white/80" : "text-zinc-400"} />
          ) : <span className="w-3.5" />}

          {isRoot
            ? <CookingPot size={18} className="text-white/80 shrink-0" />
            : <Cube size={15} className={r.is_intermediate ? "text-amber-500 shrink-0" : "text-[#002FA7] shrink-0"} />
          }
          {r.code_article && (
            <span className={"text-[10px] font-mono px-1 py-0.5 rounded shrink-0 " + (isRoot ? "bg-white/20 text-white/80" : "bg-zinc-100 text-zinc-400")}>{r.code_article}</span>
          )}
          <span className={"font-semibold text-sm truncate " + (isRoot ? "text-white" : "")}>{r.name}</span>

          {r.is_intermediate && !isRoot && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium shrink-0">Semi-fini</span>
          )}
          {r.product_type && isRoot && (
            <span className={"text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 " + (isRoot ? "bg-white/20 text-white/90" : "bg-blue-100 text-blue-700")}>{r.product_type}</span>
          )}
          {r.supplier_name && (
            <span className={"text-[10px] px-1.5 py-0.5 rounded shrink-0 " + (isRoot ? "bg-white/20 text-white/90" : "bg-zinc-100 text-zinc-500")}>{r.supplier_name}</span>
          )}
          {r.version && isRoot && (
            <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white/90 rounded shrink-0">{r.version}</span>
          )}

          <span className={"text-xs ml-auto shrink-0 " + (isRoot ? "text-white/60" : "text-zinc-400")}>{summary}</span>

          <Button size="sm" variant={isRoot ? "secondary" : "outline"} className="h-6 text-[11px] px-2 shrink-0 ml-1"
            onClick={(e) => { e.stopPropagation(); openCostPopup(r.id); }}
            data-testid={"bom-detail-" + r.id}
          >
            <Eye size={12} className="mr-1" /> Detail
          </Button>
        </div>
      );
    }

    if (row.type === "raw") {
      const ing = row.ingredient;
      const code = getCode(ing.material_id);
      let detail = ing.quantity + " " + (ing.unit || "");
      if (ing.freinte > 0) detail += " (" + ing.freinte + "% freinte)";
      return (
        <div key={"raw-" + idx} style={{ marginLeft: ml }} className="flex items-center gap-2 py-1.5 px-3 my-0.5 rounded-md bg-zinc-50 border border-zinc-200">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0 -ml-4" />
          <Package size={14} className="text-zinc-400 shrink-0" />
          {code && <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded shrink-0">{code}</span>}
          <span className="text-sm text-zinc-700 truncate">{ing.material_name}</span>
          <span className="text-xs text-zinc-400 ml-auto shrink-0 font-mono">{detail}</span>
        </div>
      );
    }

    if (row.type === "labor") {
      const lab = row.labor;
      return (
        <div key={"lab-" + idx} style={{ marginLeft: ml }} className="flex items-center gap-2 py-1.5 px-3 my-0.5 rounded-md bg-blue-50 border border-blue-200">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0 -ml-4" />
          <span className="text-xs font-bold text-blue-500 shrink-0">MO</span>
          <span className="text-sm text-blue-800 truncate">{lab.description}</span>
          <span className="text-xs text-blue-500 ml-auto shrink-0 font-mono">{lab.hours}h x {lab.hourly_rate} EUR</span>
        </div>
      );
    }

    if (row.type === "missing") {
      return (
        <div key={"miss-" + idx} style={{ marginLeft: ml }} className="flex items-center gap-2 py-1.5 px-3 my-0.5 rounded-md bg-red-50 border border-red-200">
          <div className="w-1.5 h-1.5 rounded-full bg-red-300 shrink-0 -ml-4" />
          <span className="text-sm text-red-400 italic">{row.name} (introuvable)</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fade-in" data-testid="bom-tree-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Arbre de Fabrication</h1>
          <p className="page-subtitle">Visualisez la structure parent-enfant de vos recettes</p>
        </div>
        <div className="flex gap-2">
          {recipes.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => toggleAll(true)} data-testid="expand-all-btn">Tout ouvrir</Button>
              <Button variant="outline" size="sm" onClick={() => toggleAll(false)} data-testid="collapse-all-btn">Tout fermer</Button>
            </>
          )}
          <Button onClick={() => setIsImportDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="import-bom-btn">
            <UploadSimple size={20} className="mr-2" /> Importer Arbre CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card" data-testid="bom-total-recipes">
          <div className="flex items-center gap-2 mb-2"><CookingPot size={20} className="text-[#002FA7]" /><span className="stat-label">Produits finis</span></div>
          <div className="stat-value">{topLevel.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-intermediate">
          <div className="flex items-center gap-2 mb-2"><TreeStructure size={20} className="text-amber-500" /><span className="stat-label">Articles semi-finis</span></div>
          <div className="stat-value">{intermediate.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-all">
          <div className="flex items-center gap-2 mb-2"><CookingPot size={20} className="text-[#10B981]" /><span className="stat-label">Total</span></div>
          <div className="stat-value">{recipes.length}</div>
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="flex items-center gap-6 mb-4 px-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-gradient-to-r from-[#002FA7] to-[#1a47c2]" /> Produit fini</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Semi-fini</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-zinc-50 border border-zinc-200" /> Matiere premiere</div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500"><div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Main d'oeuvre</div>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <TreeStructure size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune recette</p>
          <p className="empty-state-text">Importez un arbre de fabrication via CSV ou creez des recettes</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><UploadSimple size={18} className="mr-2" /> Importer CSV</Button>
            <Button onClick={() => navigate("/recipes")} className="bg-[#002FA7] hover:bg-[#002482]">Creer une recette</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <h3 className="font-semibold text-zinc-900 mb-5 flex items-center gap-2">
              <CookingPot size={18} className="text-[#002FA7]" /> Produits finis
            </h3>
            {topLevel.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucun produit fini.</p>
            ) : (
              <div>{topLevel.map((r, i) => buildFlatList(r, recipes, expandedIds, 0).map(renderRow))}</div>
            )}
          </div>
          {intermediate.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6">
              <h3 className="font-semibold text-zinc-900 mb-5 flex items-center gap-2">
                <TreeStructure size={18} className="text-amber-500" /> Articles semi-finis
              </h3>
              <div>{intermediate.map((r, i) => buildFlatList(r, recipes, expandedIds, 0).map(renderRow))}</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[550px]" data-testid="import-bom-dialog">
          <DialogHeader><DialogTitle>Importer un arbre de fabrication (CSV)</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Format du fichier CSV</p>
                  <p className="text-sm text-blue-700 mt-1">Colonnes : name, description, output_quantity, output_unit, margin, is_intermediate, ingredient_name, ingredient_quantity, ingredient_unit, ingredient_price, freinte, sub_recipe, labor_description, labor_hours, labor_rate</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => window.open(API + "/recipes/bom-csv-template", "_blank")} data-testid="download-bom-template-btn">
                <DownloadSimple size={18} className="mr-2" /> Telecharger le modele CSV
              </Button>
            </div>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" data-testid="bom-csv-file-input" />
              <UploadSimple size={40} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 mb-3">{importing ? "Import en cours..." : "Selectionnez votre fichier CSV"}</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="select-bom-csv-btn">
                {importing ? "Import en cours..." : "Selectionner un fichier"}
              </Button>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Summary Popup */}
      <Dialog open={costPopup !== null || costLoading} onOpenChange={() => setCostPopup(null)}>
        <DialogContent className="sm:max-w-[600px]" data-testid="cost-popup">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator size={20} className="text-[#002FA7]" />
              {costPopup ? costPopup.recipe_name : "Chargement..."}
              {costPopup?.supplier_name && <span className="text-xs font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">{costPopup.supplier_name}</span>}
              {costPopup?.product_type && <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{costPopup.product_type}</span>}
            </DialogTitle>
          </DialogHeader>
          {costLoading ? (
            <div className="py-8 text-center text-zinc-500">Calcul en cours...</div>
          ) : costPopup && (
            <div className="py-4 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider">Prix de revient</p>
                  <p className="text-xl font-bold text-zinc-900 mt-1">{costPopup.cost_per_unit.toFixed(2)} <span className="text-sm font-normal text-zinc-500">EUR/{costPopup.output_unit}</span></p>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider">Cout total</p>
                  <p className="text-xl font-bold text-zinc-900 mt-1">{costPopup.total_cost.toFixed(2)} <span className="text-sm font-normal text-zinc-500">EUR</span></p>
                </div>
                <div className="bg-[#002FA7]/5 border border-[#002FA7]/20 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-[#002FA7] font-medium tracking-wider">Prix de vente</p>
                  <p className="text-xl font-bold text-[#002FA7] mt-1">{costPopup.suggested_price.toFixed(2)} <span className="text-sm font-normal">EUR</span></p>
                  <p className="text-[10px] text-zinc-500">Marge {costPopup.target_margin}%</p>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-50 px-4 py-2 border-b">
                  <span>Poste</span><span className="text-right">Montant</span><span className="text-right">Freinte</span><span className="text-right">% du total</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  <div className="grid grid-cols-4 px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2"><Package size={14} className="text-zinc-400" /> Matieres</span>
                    <span className="text-right font-mono">{costPopup.total_material_cost.toFixed(2)} EUR</span>
                    <span className="text-right font-mono text-amber-600">{costPopup.total_freinte_cost.toFixed(2)} EUR</span>
                    <span className="text-right font-mono">{costPopup.total_cost > 0 ? ((costPopup.total_material_cost / costPopup.total_cost) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="grid grid-cols-4 px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2"><span className="text-xs font-bold text-blue-500">MO</span> Main d'oeuvre</span>
                    <span className="text-right font-mono">{costPopup.total_labor_cost.toFixed(2)} EUR</span>
                    <span className="text-right text-zinc-300">-</span>
                    <span className="text-right font-mono">{costPopup.total_cost > 0 ? ((costPopup.total_labor_cost / costPopup.total_cost) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="grid grid-cols-4 px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2"><Cube size={14} className="text-zinc-400" /> Frais generaux</span>
                    <span className="text-right font-mono">{costPopup.total_overhead_cost.toFixed(2)} EUR</span>
                    <span className="text-right text-zinc-300">-</span>
                    <span className="text-right font-mono">{costPopup.total_cost > 0 ? ((costPopup.total_overhead_cost / costPopup.total_cost) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 px-4 py-2.5 text-sm font-bold bg-zinc-50 border-t">
                  <span>Total</span>
                  <span className="text-right font-mono">{costPopup.total_cost.toFixed(2)} EUR</span>
                  <span className="text-right font-mono text-amber-600">{costPopup.total_freinte_cost.toFixed(2)} EUR</span>
                  <span className="text-right">100%</span>
                </div>
              </div>

              {/* Detail lists */}
              {costPopup.material_details && costPopup.material_details.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Detail matieres ({costPopup.material_details.length})</p>
                  <div className="space-y-1">
                    {costPopup.material_details.map((m, i) => (
                      <div key={i} className="flex justify-between text-sm px-3 py-1.5 bg-zinc-50 rounded" data-testid={"cost-mat-" + i}>
                        <span className="text-zinc-700">
                          {m.code_article && <span className="text-[10px] font-mono text-zinc-400 mr-1">[{m.code_article}]</span>}
                          {m.name} <span className="text-zinc-400 text-xs">{m.quantity} {m.unit}</span>
                        </span>
                        <span className="font-mono text-zinc-900">{(m.total_cost || 0).toFixed(2)} EUR {(m.freinte_cost || 0) > 0 && <span className="text-amber-500 text-xs">(+{(m.freinte_cost).toFixed(2)} freinte)</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {costPopup.sub_recipe_details && costPopup.sub_recipe_details.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Sous-recettes ({costPopup.sub_recipe_details.length})</p>
                  <div className="space-y-1">
                    {costPopup.sub_recipe_details.map((s, i) => (
                      <div key={i} className="flex justify-between text-sm px-3 py-1.5 bg-amber-50 rounded" data-testid={"cost-sub-" + i}>
                        <span className="text-zinc-700">{s.name} <span className="text-zinc-400 text-xs">{s.quantity} {s.unit}</span></span>
                        <span className="font-mono text-zinc-900">{(s.total_cost || 0).toFixed(2)} EUR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {costPopup.labor_details && costPopup.labor_details.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Main d'oeuvre ({costPopup.labor_details.length})</p>
                  <div className="space-y-1">
                    {costPopup.labor_details.map((l, i) => (
                      <div key={i} className="flex justify-between text-sm px-3 py-1.5 bg-blue-50 rounded" data-testid={"cost-lab-" + i}>
                        <span className="text-zinc-700">{l.description} <span className="text-zinc-400 text-xs">{l.hours}h x {l.hourly_rate} EUR/h</span></span>
                        <span className="font-mono text-zinc-900">{(l.total_cost || 0).toFixed(2)} EUR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-zinc-400 pt-2">
                Production : {costPopup.output_quantity} {costPopup.output_unit}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostPopup(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
