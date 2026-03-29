import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Eye, Pencil, Trash, CookingPot, Calculator, UploadSimple, DownloadSimple, FileText, TreeStructure } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OUTPUT_UNITS = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogramme" },
  { value: "L", label: "Litre" },
  { value: "unite", label: "Unite" },
  { value: "lot", label: "Lot" },
  { value: "boite", label: "Boite" },
];

const Recipes = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeCosts, setRecipeCosts] = useState({});
  const [formData, setFormData] = useState({
    name: "", description: "", output_quantity: "1", output_unit: "piece",
    target_margin: "30", is_intermediate: false, category_id: "",
  });

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch {}
  };

  const fetchRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
      const costs = {};
      for (const recipe of response.data) {
        try {
          const costResponse = await axios.get(`${API}/recipes/${recipe.id}/cost`);
          costs[recipe.id] = costResponse.data;
        } catch {
          costs[recipe.id] = null;
        }
      }
      setRecipeCosts(costs);
    } catch (error) {
      toast.error("Erreur lors du chargement des recettes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        output_quantity: parseFloat(formData.output_quantity),
        output_unit: formData.output_unit,
        target_margin: parseFloat(formData.target_margin) || 30,
        is_intermediate: formData.is_intermediate,
        category_id: formData.category_id || null,
        ingredients: [],
        labor_costs: [],
        overhead_ids: [],
      };

      if (selectedRecipe) {
        await axios.put(`${API}/recipes/${selectedRecipe.id}`, data);
        toast.success("Recette mise a jour");
      } else {
        const response = await axios.post(`${API}/recipes`, data);
        toast.success("Recette creee");
        navigate(`/recipes/${response.data.id}`);
        return;
      }
      setIsDialogOpen(false);
      resetForm();
      fetchRecipes();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (recipe, e) => {
    e.stopPropagation();
    setSelectedRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || "",
      output_quantity: recipe.output_quantity.toString(),
      output_unit: recipe.output_unit,
      target_margin: (recipe.target_margin || 30).toString(),
      is_intermediate: recipe.is_intermediate || false,
      category_id: recipe.category_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/recipes/${selectedRecipe.id}`);
      toast.success("Recette supprimee");
      setIsDeleteDialogOpen(false);
      setSelectedRecipe(null);
      fetchRecipes();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedRecipe(null);
    setFormData({ name: "", description: "", output_quantity: "1", output_unit: "piece", target_margin: "30", is_intermediate: false, category_id: "" });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(`${API}/recipes/import-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success(`${response.data.imported_count} recette(s) importee(s)`);
        if (response.data.errors?.length > 0) {
          toast.warning(`${response.data.errors.length} erreur(s)`);
        }
        fetchRecipes();
      } else {
        toast.error("Aucune recette importee");
      }
      setIsImportDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    window.open(`${API}/recipes/csv-template`, '_blank');
  };

  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || "";

  if (loading) {
    return <div className="flex items-center justify-center h-64" data-testid="recipes-loading"><div className="text-zinc-500">Chargement...</div></div>;
  }

  return (
    <div className="fade-in" data-testid="recipes-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title" data-testid="recipes-title">Recettes de Production</h1>
          <p className="page-subtitle">Definissez vos recettes et calculez les prix de revient</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="import-csv-btn">
            <UploadSimple size={20} className="mr-2" /> Importer CSV
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-recipe-btn">
            <Plus size={20} className="mr-2" /> Nouvelle recette
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-recipes-message">
          <CookingPot size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune recette</p>
          <p className="empty-state-text">Creez votre premiere recette ou importez depuis un CSV</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="import-first-csv-btn">
              <UploadSimple size={20} className="mr-2" /> Importer CSV
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-first-recipe-btn">
              <Plus size={20} className="mr-2" /> Creer une recette
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="recipes-grid">
          {recipes.map((recipe, index) => {
            const cost = recipeCosts[recipe.id];
            return (
              <div
                key={recipe.id}
                className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${recipe.is_intermediate ? "border-amber-200 bg-amber-50/30" : "border-zinc-200"}`}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                data-testid={`recipe-card-${index}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 text-lg truncate">{recipe.name}</h3>
                      {recipe.is_intermediate && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1">
                          <TreeStructure size={10} /> Semi-fini
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {recipe.output_quantity} {recipe.output_unit}
                      {getCategoryName(recipe.category_id) && ` \u2022 ${getCategoryName(recipe.category_id)}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={(e) => handleEdit(recipe, e)} className="p-2 hover:bg-zinc-100 rounded-md" data-testid={`edit-recipe-${index}`}>
                      <Pencil size={16} className="text-zinc-600" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRecipe(recipe); setIsDeleteDialogOpen(true); }} className="p-2 hover:bg-red-50 rounded-md" data-testid={`delete-recipe-${index}`}>
                      <Trash size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {recipe.description && (
                  <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{recipe.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-zinc-500 pt-3 border-t border-zinc-100">
                  <span>{recipe.ingredients?.length || 0} ingredients</span>
                  <span>{recipe.labor_costs?.length || 0} main d'oeuvre</span>
                </div>

                {cost && (
                  <div className="mt-4 p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Prix de revient</span>
                      <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-[#002FA7]" />
                        <span className="font-mono font-bold text-[#002FA7] text-lg">{cost.cost_per_unit.toFixed(2)} EUR</span>
                      </div>
                    </div>
                    {cost.suggested_price > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-zinc-400">Prix vente conseille (marge {recipe.target_margin || 30}%)</span>
                        <span className="font-mono text-sm text-[#10B981] font-semibold">{cost.suggested_price.toFixed(2)} EUR</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline" className="w-full mt-4"
                  onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}`); }}
                  data-testid={`view-recipe-${index}`}
                >
                  <Eye size={16} className="mr-2" /> Voir les details
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="recipe-dialog">
          <DialogHeader>
            <DialogTitle data-testid="recipe-dialog-title">
              {selectedRecipe ? "Modifier la recette" : "Nouvelle recette"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la recette *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pain de campagne" required data-testid="recipe-name-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description de la recette..." rows={2} data-testid="recipe-description-input" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="output_quantity">Quantite produite *</Label>
                  <Input id="output_quantity" type="number" step="0.01" min="0.01" value={formData.output_quantity} onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })} required data-testid="recipe-quantity-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="output_unit">Unite de sortie *</Label>
                  <Select value={formData.output_unit} onValueChange={(v) => setFormData({ ...formData, output_unit: v })}>
                    <SelectTrigger data-testid="recipe-unit-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OUTPUT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_margin">Marge cible (%)</Label>
                  <Input id="target_margin" type="number" step="0.1" min="0" max="99" value={formData.target_margin} onChange={(e) => setFormData({ ...formData, target_margin: e.target.value })} data-testid="recipe-margin-input" />
                </div>
              </div>
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="recipe-category-select"><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="is_intermediate"
                  checked={formData.is_intermediate}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_intermediate: !!checked })}
                  data-testid="recipe-intermediate-checkbox"
                />
                <label htmlFor="is_intermediate" className="cursor-pointer">
                  <p className="font-medium text-amber-900 text-sm">Article semi-fini</p>
                  <p className="text-xs text-amber-700">Cette recette peut etre utilisee comme composant dans d'autres recettes (arbre de fabrication)</p>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="recipe-cancel-btn">Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="recipe-submit-btn">
                {selectedRecipe ? "Mettre a jour" : "Creer et configurer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-recipe-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Supprimer "{selectedRecipe?.name}" ? Cette action est irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-recipe-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="delete-recipe-confirm">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="import-csv-dialog">
          <DialogHeader><DialogTitle>Importer des recettes (CSV)</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Format du fichier CSV</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Colonnes : name, description, output_quantity, output_unit, margin, ingredient_name, ingredient_quantity, ingredient_unit, ingredient_price, freinte, labor_description, labor_hours, labor_rate
                  </p>
                  <p className="text-sm text-blue-600 mt-2">Separateur : point-virgule (;) ou virgule (,)</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate} data-testid="download-template-btn">
                <DownloadSimple size={18} className="mr-2" /> Telecharger le modele CSV
              </Button>
            </div>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" data-testid="csv-file-input" />
              <UploadSimple size={40} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 mb-3">{importing ? "Import en cours..." : "Selectionnez votre fichier CSV"}</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="select-csv-btn">
                {importing ? "Import en cours..." : "Selectionner un fichier"}
              </Button>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recipes;
