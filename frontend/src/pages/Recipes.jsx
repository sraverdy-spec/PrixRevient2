import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Eye, Pencil, Trash, CookingPot, Calculator, UploadSimple, DownloadSimple, FileText } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OUTPUT_UNITS = [
  { value: "pièce", label: "Pièce" },
  { value: "kg", label: "Kilogramme" },
  { value: "L", label: "Litre" },
  { value: "unité", label: "Unité" },
  { value: "lot", label: "Lot" },
  { value: "boîte", label: "Boîte" },
];

const Recipes = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeCosts, setRecipeCosts] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    output_quantity: "1",
    output_unit: "pièce",
  });

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
      
      // Fetch costs for each recipe
      const costs = {};
      for (const recipe of response.data) {
        try {
          const costResponse = await axios.get(`${API}/recipes/${recipe.id}/cost`);
          costs[recipe.id] = costResponse.data;
        } catch (e) {
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
        ...formData,
        output_quantity: parseFloat(formData.output_quantity),
        ingredients: [],
        labor_costs: [],
        overhead_ids: [],
      };

      if (selectedRecipe) {
        await axios.put(`${API}/recipes/${selectedRecipe.id}`, data);
        toast.success("Recette mise à jour");
      } else {
        const response = await axios.post(`${API}/recipes`, data);
        toast.success("Recette créée");
        // Navigate to detail page to add ingredients
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/recipes/${selectedRecipe.id}`);
      toast.success("Recette supprimée");
      setIsDeleteDialogOpen(false);
      setSelectedRecipe(null);
      fetchRecipes();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedRecipe(null);
    setFormData({
      name: "",
      description: "",
      output_quantity: "1",
      output_unit: "pièce",
    });
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/recipes/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success(`${response.data.imported_count} recette(s) importée(s) avec succès`);
        if (response.data.errors.length > 0) {
          toast.warning(`${response.data.errors.length} erreur(s) lors de l'import`);
        }
        fetchRecipes();
      } else {
        toast.error("Erreur lors de l'import");
      }
      setIsImportDialogOpen(false);
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'import du fichier";
      toast.error(message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    window.open(`${API}/recipes/csv-template`, '_blank');
    toast.success("Téléchargement du modèle...");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="recipes-loading">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" data-testid="recipes-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title" data-testid="recipes-title">Recettes de Production</h1>
          <p className="page-subtitle">Définissez vos recettes et calculez les prix de revient</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="import-csv-btn"
          >
            <UploadSimple size={20} className="mr-2" />
            Importer CSV
          </Button>
          <Button 
            onClick={openNewDialog}
            className="bg-[#002FA7] hover:bg-[#002482]"
            data-testid="add-recipe-btn"
          >
            <Plus size={20} className="mr-2" />
            Nouvelle recette
          </Button>
        </div>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-recipes-message">
          <CookingPot size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune recette</p>
          <p className="empty-state-text">Créez votre première recette de production ou importez depuis un CSV</p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              data-testid="import-first-csv-btn"
            >
              <UploadSimple size={20} className="mr-2" />
              Importer CSV
            </Button>
            <Button 
              onClick={openNewDialog}
              className="bg-[#002FA7] hover:bg-[#002482]"
              data-testid="add-first-recipe-btn"
            >
              <Plus size={20} className="mr-2" />
              Créer une recette
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
                className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                data-testid={`recipe-card-${index}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-lg">{recipe.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {recipe.output_quantity} {recipe.output_unit}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleEdit(recipe, e)}
                      className="p-2 hover:bg-zinc-100 rounded-md transition-colors"
                      data-testid={`edit-recipe-${index}`}
                    >
                      <Pencil size={16} className="text-zinc-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecipe(recipe);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="p-2 hover:bg-red-50 rounded-md transition-colors"
                      data-testid={`delete-recipe-${index}`}
                    >
                      <Trash size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {recipe.description && (
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{recipe.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>{recipe.ingredients?.length || 0} ingrédients</span>
                    <span>{recipe.labor_costs?.length || 0} main d'œuvre</span>
                  </div>
                </div>

                {cost && (
                  <div className="mt-4 p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Prix de revient</span>
                      <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-[#002FA7]" />
                        <span className="font-mono font-bold text-[#002FA7] text-lg">
                          {cost.cost_per_unit.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">par {recipe.output_unit}</p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/recipes/${recipe.id}`);
                  }}
                  data-testid={`view-recipe-${index}`}
                >
                  <Eye size={16} className="mr-2" />
                  Voir les détails
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="recipe-dialog">
          <DialogHeader>
            <DialogTitle data-testid="recipe-dialog-title">
              {selectedRecipe ? "Modifier la recette" : "Nouvelle recette"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la recette *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pain de campagne"
                  required
                  data-testid="recipe-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la recette..."
                  rows={3}
                  data-testid="recipe-description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="output_quantity">Quantité produite *</Label>
                  <Input
                    id="output_quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.output_quantity}
                    onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })}
                    placeholder="1"
                    required
                    data-testid="recipe-quantity-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="output_unit">Unité de sortie *</Label>
                  <Select 
                    value={formData.output_unit} 
                    onValueChange={(value) => setFormData({ ...formData, output_unit: value })}
                  >
                    <SelectTrigger data-testid="recipe-unit-select">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="recipe-cancel-btn">
                Annuler
              </Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="recipe-submit-btn">
                {selectedRecipe ? "Mettre à jour" : "Créer et configurer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-recipe-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedRecipe?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-recipe-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="delete-recipe-confirm">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="import-csv-dialog">
          <DialogHeader>
            <DialogTitle>Importer des recettes depuis un fichier CSV</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Format du fichier CSV</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Colonnes attendues: name, description, output_quantity, output_unit, 
                    ingredient_name, ingredient_quantity, ingredient_unit, ingredient_price, 
                    labor_description, labor_hours, labor_rate
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Séparateur: point-virgule (;) ou virgule (,)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                data-testid="download-template-btn"
              >
                <DownloadSimple size={18} className="mr-2" />
                Télécharger le modèle CSV
              </Button>
            </div>

            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                data-testid="csv-file-input"
              />
              <UploadSimple size={40} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 mb-3">
                {importing ? "Import en cours..." : "Glissez votre fichier CSV ici ou"}
              </p>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                data-testid="select-csv-btn"
              >
                {importing ? "Import en cours..." : "Sélectionner un fichier"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recipes;
