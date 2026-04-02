import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Eye, Pencil, Trash, CookingPot, Calculator, UploadSimple, DownloadSimple, FileText, TreeStructure, Copy, Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
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

const PRODUCT_TYPES = [
  { value: "MDD", label: "MDD - Marque Distributeur", color: "bg-blue-100 text-blue-700" },
  { value: "MN", label: "MN - Marque Nationale", color: "bg-emerald-100 text-emerald-700" },
  { value: "SM", label: "SM - Sans Marque", color: "bg-zinc-100 text-zinc-700" },
  { value: "MP", label: "MP - Marque Propre", color: "bg-violet-100 text-violet-700" },
];

const Recipes = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { isManager } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeCosts, setRecipeCosts] = useState({});
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterVersion, setFilterVersion] = useState("all");
  const [filterProductType, setFilterProductType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "", description: "", output_quantity: "1", output_unit: "piece",
    target_margin: "30", is_intermediate: false, category_id: "", supplier_id: "", supplier_name: "", product_type: "",
  });

  useEffect(() => {
    Promise.all([fetchRecipes(), fetchCategories(), fetchSuppliers(), fetchUnits()]);
  }, []);

  const fetchCategories = async () => {
    try { setCategories((await axios.get(`${API}/categories`)).data); } catch {}
  };
  const fetchSuppliers = async () => {
    try { setSuppliers((await axios.get(`${API}/suppliers`)).data); } catch {}
  };
  const fetchUnits = async () => {
    try { setUnits((await axios.get(`${API}/units`)).data); } catch {}
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
    } catch {
      toast.error("Erreur lors du chargement des recettes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      const data = {
        name: formData.name,
        description: formData.description,
        output_quantity: parseFloat(formData.output_quantity),
        output_unit: formData.output_unit,
        target_margin: parseFloat(formData.target_margin) || 30,
        is_intermediate: formData.is_intermediate,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        supplier_name: supplier ? supplier.name : "",
        product_type: formData.product_type || null,
        ingredients: [],
        labor_costs: [],
        overhead_ids: [],
      };

      if (selectedRecipe) {
        data.ingredients = selectedRecipe.ingredients || [];
        data.labor_costs = selectedRecipe.labor_costs || [];
        data.overhead_ids = selectedRecipe.overhead_ids || [];
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
    } catch {
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
      supplier_id: recipe.supplier_id || "",
      supplier_name: recipe.supplier_name || "",
      product_type: recipe.product_type || "",
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
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDuplicate = async (recipe, e) => {
    e.stopPropagation();
    try {
      const res = await axios.post(`${API}/recipes/${recipe.id}/duplicate`);
      toast.success(`Recette dupliquee (v${res.data.version})`);
      fetchRecipes();
    } catch {
      toast.error("Erreur lors de la duplication");
    }
  };

  const resetForm = () => {
    setSelectedRecipe(null);
    setFormData({ name: "", description: "", output_quantity: "1", output_unit: "piece", target_margin: "30", is_intermediate: false, category_id: "", supplier_id: "", supplier_name: "", product_type: "" });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(`${API}/recipes/import-csv`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        toast.success(`${response.data.imported_count} recette(s) importee(s)`);
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

  // Filtering
  const filteredRecipes = recipes.filter(r => {
    if (filterSupplier !== "all" && (r.supplier_name || "") !== filterSupplier) return false;
    if (filterVersion !== "all" && (r.version || 1).toString() !== filterVersion) return false;
    if (filterProductType !== "all" && (r.product_type || "") !== filterProductType) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by supplier
  const groupedBySupplier = {};
  filteredRecipes.forEach(r => {
    const key = r.supplier_name || "Sans client";
    if (!groupedBySupplier[key]) groupedBySupplier[key] = [];
    groupedBySupplier[key].push(r);
  });

  // Unique values for filters
  const uniqueSuppliers = [...new Set(recipes.map(r => r.supplier_name || "").filter(Boolean))];
  const uniqueVersions = [...new Set(recipes.map(r => (r.version || 1).toString()))].sort();

  if (loading) {
    return <div className="flex items-center justify-center h-64" data-testid="recipes-loading"><div className="text-zinc-500">Chargement...</div></div>;
  }

  return (
    <div className="fade-in" data-testid="recipes-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title" data-testid="recipes-title">Recettes de Production</h1>
          <p className="page-subtitle">Definissez vos recettes et calculez les prix de revient</p>
        </div>
        <div className="flex gap-3">
          {isManager && (
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="import-csv-btn">
              <UploadSimple size={18} className="mr-2" /> Importer CSV
            </Button>
          )}
          {isManager && (
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-recipe-btn">
              <Plus size={18} className="mr-2" /> Nouvelle recette
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4" data-testid="recipe-filters">
        <div className="flex items-center gap-2">
          <MagnifyingGlass size={18} className="text-zinc-400" />
          <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 w-48" data-testid="search-input" />
        </div>
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-zinc-400" />
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="h-9 w-48" data-testid="filter-supplier"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterVersion} onValueChange={setFilterVersion}>
          <SelectTrigger className="h-9 w-32" data-testid="filter-version"><SelectValue placeholder="Version" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes versions</SelectItem>
            {uniqueVersions.map(v => <SelectItem key={v} value={v}>v{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProductType} onValueChange={setFilterProductType}>
          <SelectTrigger className="h-9 w-44" data-testid="filter-product-type"><SelectValue placeholder="Type produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {PRODUCT_TYPES.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterSupplier !== "all" || filterVersion !== "all" || filterProductType !== "all" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterSupplier("all"); setFilterVersion("all"); setFilterProductType("all"); setSearchQuery(""); }} data-testid="clear-filters">
            Effacer les filtres
          </Button>
        )}
        <span className="text-sm text-zinc-400 ml-auto">{filteredRecipes.length} recette(s)</span>
      </div>

      {filteredRecipes.length === 0 && recipes.length > 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <Funnel size={48} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucun resultat</p>
          <p className="empty-state-text">Modifiez vos filtres pour voir des recettes</p>
        </div>
      ) : recipes.length === 0 ? (
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
        Object.entries(groupedBySupplier).map(([supplierName, supplierRecipes]) => (
          <div key={supplierName} className="mb-6" data-testid={"supplier-group-" + supplierName.replace(/\s+/g, "-").toLowerCase()}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold text-zinc-800">{supplierName}</h2>
              <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{supplierRecipes.length}</span>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-medium">Recette</th>
                    <th className="text-center py-3 px-2 font-medium w-16">Version</th>
                    <th className="text-center py-3 px-2 font-medium w-20">Type</th>
                    <th className="text-left py-3 px-2 font-medium">Categorie</th>
                    <th className="text-right py-3 px-2 font-medium">Quantite</th>
                    <th className="text-right py-3 px-3 font-medium">Prix revient</th>
                    <th className="text-right py-3 px-3 font-medium">Prix vente</th>
                    <th className="text-center py-3 px-2 font-medium w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {supplierRecipes.map((recipe, index) => {
                    const cost = recipeCosts[recipe.id];
                    return (
                      <tr key={recipe.id} className="hover:bg-zinc-50 transition-colors" data-testid={"recipe-row-" + index}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900">{recipe.name}</span>
                            {recipe.is_intermediate && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1">
                                <TreeStructure size={10} /> Semi-fini
                              </span>
                            )}
                          </div>
                          {recipe.description && <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{recipe.description}</p>}
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-mono font-medium">v{recipe.version || 1}</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          {recipe.product_type ? (() => {
                            const pt = PRODUCT_TYPES.find(p => p.value === recipe.product_type);
                            return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pt?.color || "bg-zinc-100 text-zinc-600"}`}>{recipe.product_type}</span>;
                          })() : <span className="text-zinc-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-zinc-500 text-xs">{getCategoryName(recipe.category_id) || "-"}</td>
                        <td className="text-right py-3 px-2 text-zinc-600">{recipe.output_quantity} {recipe.output_unit}</td>
                        <td className="text-right py-3 px-3">
                          {cost ? <span className="font-mono font-bold text-[#002FA7]">{cost.cost_per_unit.toFixed(2)} EUR</span> : <span className="text-zinc-300">-</span>}
                        </td>
                        <td className="text-right py-3 px-3">
                          {cost?.suggested_price > 0 ? <span className="font-mono font-semibold text-emerald-600">{cost.suggested_price.toFixed(2)} EUR</span> : <span className="text-zinc-300">-</span>}
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}`); }} className="p-1.5 hover:bg-blue-50 rounded-md" title="Detail" data-testid={"view-recipe-" + index}>
                              <Eye size={16} className="text-blue-600" />
                            </button>
                            {isManager && (
                              <button onClick={(e) => handleDuplicate(recipe, e)} className="p-1.5 hover:bg-violet-50 rounded-md" title="Dupliquer" data-testid={"duplicate-recipe-" + index}>
                                <Copy size={16} className="text-violet-600" />
                              </button>
                            )}
                            {isManager && (
                              <button onClick={(e) => handleEdit(recipe, e)} className="p-1.5 hover:bg-zinc-100 rounded-md" title="Modifier" data-testid={"edit-recipe-" + index}>
                                <Pencil size={16} className="text-zinc-600" />
                              </button>
                            )}
                            {isManager && (
                              <button onClick={(e) => { e.stopPropagation(); setSelectedRecipe(recipe); setIsDeleteDialogOpen(true); }} className="p-1.5 hover:bg-red-50 rounded-md" title="Supprimer" data-testid={"delete-recipe-" + index}>
                                <Trash size={16} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
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
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la recette *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pain de campagne" required data-testid="recipe-name-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description de la recette..." rows={2} data-testid="recipe-description-input" />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={formData.supplier_id || "none"} onValueChange={(v) => setFormData({ ...formData, supplier_id: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="recipe-supplier-select"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de produit</Label>
                <Select value={formData.product_type || "none"} onValueChange={(v) => setFormData({ ...formData, product_type: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="recipe-product-type-select"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {PRODUCT_TYPES.map((pt) => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                      {units.length > 0 ? units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>) : (
                        <>
                          <SelectItem value="piece">Piece</SelectItem>
                          <SelectItem value="kg">Kilogramme</SelectItem>
                          <SelectItem value="L">Litre</SelectItem>
                          <SelectItem value="unite">Unite</SelectItem>
                          <SelectItem value="lot">Lot</SelectItem>
                          <SelectItem value="boite">Boite</SelectItem>
                        </>
                      )}
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
                  <p className="text-xs text-amber-700">Cette recette peut etre utilisee comme composant dans d'autres recettes</p>
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
