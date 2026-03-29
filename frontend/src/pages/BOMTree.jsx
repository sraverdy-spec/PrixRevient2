import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TreeStructure, CookingPot, Eye, UploadSimple, DownloadSimple, FileText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function BOMTree() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = () => {
    axios.get(API + "/recipes")
      .then(res => setRecipes(res.data))
      .catch(() => toast.error("Erreur"))
      .finally(() => setLoading(false));
  };

  const toggle = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(API + "/recipes/import-bom-csv", fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success(response.data.imported_count + " recette(s) importee(s) (" + response.data.intermediate_count + " semi-fini(s))");
        if (response.data.errors?.length > 0) {
          toast.warning(response.data.errors.length + " erreur(s)");
        }
        fetchRecipes();
      }
      setIsImportDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    window.open(API + "/recipes/bom-csv-template", '_blank');
  };

  const topLevel = recipes.filter(r => !r.is_intermediate);
  const intermediate = recipes.filter(r => r.is_intermediate);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;
  }

  const renderNode = (recipe, depth) => {
    const subs = (recipe.ingredients || []).filter(i => i.is_sub_recipe);
    const raws = (recipe.ingredients || []).filter(i => !i.is_sub_recipe);
    const isOpen = expandedIds[recipe.id + "-" + depth];
    const ml = depth * 28;

    let bgClass = "bg-white border-zinc-200";
    if (depth === 0) bgClass = "bg-[#002FA7] text-white border-[#002FA7]";
    else if (recipe.is_intermediate) bgClass = "bg-amber-50 border-amber-200";

    return (
      <div key={recipe.id + "-" + depth}>
        <div
          className={"flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm mb-1 " + bgClass}
          style={{ marginLeft: ml }}
          onClick={() => subs.length > 0 && toggle(recipe.id + "-" + depth)}
          data-testid={"bom-node-" + recipe.id}
        >
          {subs.length > 0 && (
            <span className="text-xs select-none">{isOpen ? "\u25BC" : "\u25B6"}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{recipe.name}</span>
              {recipe.is_intermediate && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Semi-fini</span>
              )}
            </div>
            <p className="text-xs opacity-70 mt-0.5">
              {raws.length + " mat. | " + (recipe.labor_costs || []).length + " MO" + (subs.length > 0 ? " | " + subs.length + " sous-rec." : "")}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate("/recipes/" + recipe.id); }}
          >
            <Eye size={12} className="mr-1" /> Detail
          </Button>
        </div>
        {isOpen && subs.length > 0 && depth < 5 && subs.map(ing => {
          const sub = recipes.find(r => r.id === ing.sub_recipe_id);
          if (!sub) return (
            <div key={ing.material_name} className="p-2 text-sm text-zinc-400 italic" style={{ marginLeft: (depth + 1) * 28 }}>
              {ing.material_name} (introuvable)
            </div>
          );
          return renderNode(sub, depth + 1);
        })}
      </div>
    );
  };

  return (
    <div className="fade-in" data-testid="bom-tree-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Arbre de Fabrication</h1>
          <p className="page-subtitle">Visualisez la structure de vos recettes et articles semi-finis</p>
        </div>
        <Button onClick={() => setIsImportDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="import-bom-btn">
          <UploadSimple size={20} className="mr-2" /> Importer Arbre CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card" data-testid="bom-total-recipes">
          <div className="flex items-center gap-2 mb-2">
            <CookingPot size={20} className="text-[#002FA7]" />
            <span className="stat-label">Produits finis</span>
          </div>
          <div className="stat-value">{topLevel.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-intermediate">
          <div className="flex items-center gap-2 mb-2">
            <TreeStructure size={20} className="text-amber-500" />
            <span className="stat-label">Articles semi-finis</span>
          </div>
          <div className="stat-value">{intermediate.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-all">
          <div className="flex items-center gap-2 mb-2">
            <CookingPot size={20} className="text-[#10B981]" />
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-value">{recipes.length}</div>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <TreeStructure size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune recette</p>
          <p className="empty-state-text">Importez un arbre de fabrication via CSV ou creez des recettes</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <UploadSimple size={18} className="mr-2" /> Importer CSV
            </Button>
            <Button onClick={() => navigate("/recipes")} className="bg-[#002FA7] hover:bg-[#002482]">Creer une recette</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Produits finis</h3>
            {topLevel.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucun produit fini.</p>
            ) : (
              <div className="space-y-1">{topLevel.map(r => renderNode(r, 0))}</div>
            )}
          </div>

          {intermediate.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Articles semi-finis disponibles</h3>
              <div className="space-y-1">{intermediate.map(r => renderNode(r, 0))}</div>
            </div>
          )}
        </div>
      )}

      {/* Import BOM CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[550px]" data-testid="import-bom-dialog">
          <DialogHeader>
            <DialogTitle>Importer un arbre de fabrication (CSV)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Format du fichier CSV</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Colonnes : name, description, output_quantity, output_unit, margin, is_intermediate, ingredient_name, ingredient_quantity, ingredient_unit, ingredient_price, freinte, sub_recipe, labor_description, labor_hours, labor_rate
                  </p>
                  <p className="text-sm text-blue-600 mt-2 font-medium">
                    Colonne "sub_recipe" : NomRecette:quantite:unite (ex: Pate brisee:0.5:kg)
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Colonne "is_intermediate" : "oui" pour les articles semi-finis
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Les articles semi-finis sont importes en premier, puis les produits finis avec les liens vers les sous-recettes.
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate} data-testid="download-bom-template-btn">
                <DownloadSimple size={18} className="mr-2" /> Telecharger le modele CSV
              </Button>
            </div>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="bom-csv-upload" data-testid="bom-csv-file-input" />
              <UploadSimple size={40} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 mb-3">{importing ? "Import en cours..." : "Selectionnez votre fichier CSV"}</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="select-bom-csv-btn">
                {importing ? "Import en cours..." : "Selectionner un fichier"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
