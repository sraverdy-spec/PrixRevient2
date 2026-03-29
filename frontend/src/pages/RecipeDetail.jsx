import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  ArrowLeft, 
  Plus, 
  Trash, 
  Calculator,
  Package,
  Clock,
  Gear,
  FilePdf,
  DownloadSimple
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CHART_COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [overheads, setOverheads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [isLaborDialogOpen, setIsLaborDialogOpen] = useState(false);
  const [isOverheadDialogOpen, setIsOverheadDialogOpen] = useState(false);
  
  // Form states
  const [ingredientForm, setIngredientForm] = useState({
    material_id: "",
    quantity: "",
  });
  const [laborForm, setLaborForm] = useState({
    description: "",
    hours: "",
    hourly_rate: "",
  });
  const [selectedOverheads, setSelectedOverheads] = useState([]);

  const fetchRecipe = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`);
      setRecipe(response.data);
      setSelectedOverheads(response.data.overhead_ids || []);
    } catch (error) {
      toast.error("Erreur lors du chargement de la recette");
      navigate("/recipes");
    }
  }, [id, navigate]);

  const fetchCostBreakdown = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}/cost`);
      setCostBreakdown(response.data);
    } catch (error) {
      console.error("Error fetching cost:", error);
    }
  }, [id]);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
    }
  };

  const fetchOverheads = async () => {
    try {
      const response = await axios.get(`${API}/overheads`);
      setOverheads(response.data);
    } catch (error) {
      console.error("Error fetching overheads:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchRecipe(), fetchMaterials(), fetchOverheads()]);
      await fetchCostBreakdown();
      setLoading(false);
    };
    loadData();
  }, [fetchRecipe, fetchCostBreakdown]);

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    const material = materials.find(m => m.id === ingredientForm.material_id);
    if (!material) return;

    const newIngredient = {
      material_id: material.id,
      material_name: material.name,
      quantity: parseFloat(ingredientForm.quantity),
      unit: material.unit,
      unit_price: material.unit_price,
    };

    const updatedIngredients = [...(recipe.ingredients || []), newIngredient];
    
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updatedIngredients });
      toast.success("Ingrédient ajouté");
      setIsIngredientDialogOpen(false);
      setIngredientForm({ material_id: "", quantity: "" });
      fetchRecipe();
      fetchCostBreakdown();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleRemoveIngredient = async (index) => {
    const updatedIngredients = recipe.ingredients.filter((_, i) => i !== index);
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updatedIngredients });
      toast.success("Ingrédient supprimé");
      fetchRecipe();
      fetchCostBreakdown();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddLabor = async (e) => {
    e.preventDefault();
    const newLabor = {
      description: laborForm.description,
      hours: parseFloat(laborForm.hours),
      hourly_rate: parseFloat(laborForm.hourly_rate),
    };

    const updatedLabor = [...(recipe.labor_costs || []), newLabor];
    
    try {
      await axios.put(`${API}/recipes/${id}`, { labor_costs: updatedLabor });
      toast.success("Coût main d'œuvre ajouté");
      setIsLaborDialogOpen(false);
      setLaborForm({ description: "", hours: "", hourly_rate: "" });
      fetchRecipe();
      fetchCostBreakdown();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleRemoveLabor = async (index) => {
    const updatedLabor = recipe.labor_costs.filter((_, i) => i !== index);
    try {
      await axios.put(`${API}/recipes/${id}`, { labor_costs: updatedLabor });
      toast.success("Coût supprimé");
      fetchRecipe();
      fetchCostBreakdown();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSaveOverheads = async () => {
    try {
      await axios.put(`${API}/recipes/${id}`, { overhead_ids: selectedOverheads });
      toast.success("Frais généraux mis à jour");
      setIsOverheadDialogOpen(false);
      fetchRecipe();
      fetchCostBreakdown();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const toggleOverhead = (overheadId) => {
    setSelectedOverheads(prev => 
      prev.includes(overheadId) 
        ? prev.filter(id => id !== overheadId)
        : [...prev, overheadId]
    );
  };

  const handleExportPdf = () => {
    const pdfUrl = `${API}/recipes/${id}/pdf`;
    window.open(pdfUrl, '_blank');
    toast.success("Génération du PDF en cours...");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="recipe-detail-loading">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  if (!recipe) return null;

  const pieData = costBreakdown ? [
    { name: "Matières", value: costBreakdown.total_material_cost },
    { name: "Main d'œuvre", value: costBreakdown.total_labor_cost },
    { name: "Frais généraux", value: costBreakdown.total_overhead_cost },
  ].filter(d => d.value > 0) : [];

  const barData = costBreakdown?.material_details?.map(m => ({
    name: m.name.length > 15 ? m.name.substring(0, 15) + "..." : m.name,
    cost: m.total_cost,
  })) || [];

  return (
    <div className="fade-in" data-testid="recipe-detail-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate("/recipes")}
            data-testid="back-to-recipes-btn"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="page-title" data-testid="recipe-detail-title">{recipe.name}</h1>
            <p className="page-subtitle">
              Produit: {recipe.output_quantity} {recipe.output_unit}
              {recipe.description && ` • ${recipe.description}`}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleExportPdf}
          className="bg-[#EF4444] hover:bg-[#DC2626]"
          data-testid="export-pdf-btn"
        >
          <FilePdf size={20} className="mr-2" />
          Exporter PDF
        </Button>
      </div>

      {/* Cost Summary Cards */}
      {costBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" data-testid="cost-summary-cards">
          <div className="stat-card" data-testid="material-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Package size={20} className="text-[#002FA7]" />
              <span className="stat-label">Matières premières</span>
            </div>
            <div className="stat-value">{costBreakdown.total_material_cost.toFixed(2)} €</div>
          </div>
          <div className="stat-card" data-testid="labor-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-[#10B981]" />
              <span className="stat-label">Main d'œuvre</span>
            </div>
            <div className="stat-value">{costBreakdown.total_labor_cost.toFixed(2)} €</div>
          </div>
          <div className="stat-card" data-testid="overhead-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Gear size={20} className="text-[#F59E0B]" />
              <span className="stat-label">Frais généraux</span>
            </div>
            <div className="stat-value">{costBreakdown.total_overhead_cost.toFixed(2)} €</div>
          </div>
          <div className="stat-card bg-[#002FA7]" data-testid="total-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={20} className="text-white" />
              <span className="stat-label text-blue-100">Prix de revient / unité</span>
            </div>
            <div className="stat-value text-white">{costBreakdown.cost_per_unit.toFixed(2)} €</div>
            <p className="text-xs text-blue-200 mt-1">Total: {costBreakdown.total_cost.toFixed(2)} €</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingredients Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="ingredients-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Ingrédients / Matières premières</h3>
              <Button 
                size="sm"
                onClick={() => setIsIngredientDialogOpen(true)}
                className="bg-[#002FA7] hover:bg-[#002482]"
                data-testid="add-ingredient-btn"
              >
                <Plus size={16} className="mr-1" />
                Ajouter
              </Button>
            </div>
            {recipe.ingredients?.length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-ingredients-message">
                <Package size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun ingrédient ajouté</p>
              </div>
            ) : (
              <table className="data-table" data-testid="ingredients-table">
                <thead>
                  <tr>
                    <th>Matière</th>
                    <th className="text-right">Quantité</th>
                    <th className="text-right">Prix/unité</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.ingredients?.map((ing, index) => (
                    <tr key={index} data-testid={`ingredient-row-${index}`}>
                      <td className="font-medium">{ing.material_name}</td>
                      <td className="text-right">{ing.quantity} {ing.unit}</td>
                      <td className="text-right font-mono">{ing.unit_price.toFixed(2)} €</td>
                      <td className="text-right font-mono font-semibold">
                        {(ing.quantity * ing.unit_price).toFixed(2)} €
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-1 hover:bg-red-50 rounded"
                          data-testid={`remove-ingredient-${index}`}
                        >
                          <Trash size={14} className="text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Labor Costs Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="labor-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Coûts de main d'œuvre</h3>
              <Button 
                size="sm"
                onClick={() => setIsLaborDialogOpen(true)}
                className="bg-[#002FA7] hover:bg-[#002482]"
                data-testid="add-labor-btn"
              >
                <Plus size={16} className="mr-1" />
                Ajouter
              </Button>
            </div>
            {recipe.labor_costs?.length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-labor-message">
                <Clock size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun coût de main d'œuvre</p>
              </div>
            ) : (
              <table className="data-table" data-testid="labor-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Heures</th>
                    <th className="text-right">Taux horaire</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.labor_costs?.map((labor, index) => (
                    <tr key={index} data-testid={`labor-row-${index}`}>
                      <td className="font-medium">{labor.description}</td>
                      <td className="text-right">{labor.hours} h</td>
                      <td className="text-right font-mono">{labor.hourly_rate.toFixed(2)} €/h</td>
                      <td className="text-right font-mono font-semibold">
                        {(labor.hours * labor.hourly_rate).toFixed(2)} €
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleRemoveLabor(index)}
                          className="p-1 hover:bg-red-50 rounded"
                          data-testid={`remove-labor-${index}`}
                        >
                          <Trash size={14} className="text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Overhead Costs Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="overhead-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Frais généraux affectés</h3>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setIsOverheadDialogOpen(true)}
                data-testid="manage-overheads-btn"
              >
                <Gear size={16} className="mr-1" />
                Gérer
              </Button>
            </div>
            {recipe.overhead_ids?.length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-overheads-message">
                <Gear size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun frais général affecté</p>
              </div>
            ) : (
              <div className="p-4 space-y-2" data-testid="overheads-list">
                {costBreakdown?.overhead_details?.map((oh, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg" data-testid={`overhead-item-${index}`}>
                    <div>
                      <p className="font-medium text-zinc-900">{oh.name}</p>
                      <p className="text-xs text-zinc-500">{oh.category} • {oh.allocation_method}</p>
                    </div>
                    <span className="font-mono font-semibold">{oh.total_cost.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="space-y-6">
          {/* Cost Distribution Pie Chart */}
          {pieData.length > 0 && (
            <div className="chart-container" data-testid="cost-pie-chart">
              <h3 className="chart-title">Répartition des coûts</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(2)} €`}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Material Costs Bar Chart */}
          {barData.length > 0 && (
            <div className="chart-container" data-testid="material-bar-chart">
              <h3 className="chart-title">Coût par matière</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis type="number" tickFormatter={(v) => `${v}€`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(2)} €`}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="cost" fill="#002FA7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cost Summary */}
          {costBreakdown && (
            <div className="chart-container" data-testid="cost-summary-breakdown">
              <h3 className="chart-title">Détail des coûts</h3>
              <div className="cost-breakdown">
                <div className="cost-row">
                  <span className="cost-label">Matières premières</span>
                  <span className="cost-value">{costBreakdown.total_material_cost.toFixed(2)} €</span>
                </div>
                <div className="cost-row">
                  <span className="cost-label">Main d'œuvre</span>
                  <span className="cost-value">{costBreakdown.total_labor_cost.toFixed(2)} €</span>
                </div>
                <div className="cost-row">
                  <span className="cost-label">Frais généraux</span>
                  <span className="cost-value">{costBreakdown.total_overhead_cost.toFixed(2)} €</span>
                </div>
                <div className="cost-row cost-total">
                  <span className="cost-label">Coût total</span>
                  <span className="cost-value">{costBreakdown.total_cost.toFixed(2)} €</span>
                </div>
                <div className="mt-4 p-4 bg-zinc-900 rounded-lg text-center">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Prix de revient unitaire</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    {costBreakdown.cost_per_unit.toFixed(2)} €
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">par {costBreakdown.output_unit}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={isIngredientDialogOpen} onOpenChange={setIsIngredientDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="ingredient-dialog">
          <DialogHeader>
            <DialogTitle>Ajouter un ingrédient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddIngredient}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Matière première *</Label>
                <Select 
                  value={ingredientForm.material_id} 
                  onValueChange={(value) => setIngredientForm({ ...ingredientForm, material_id: value })}
                >
                  <SelectTrigger data-testid="ingredient-material-select">
                    <SelectValue placeholder="Sélectionner une matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((mat) => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name} ({mat.unit_price.toFixed(2)} €/{mat.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {materials.length === 0 && (
                  <p className="text-sm text-amber-600">
                    Aucune matière première. <a href="/materials" className="underline">Créez-en d'abord</a>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={ingredientForm.quantity}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: e.target.value })}
                  placeholder="Ex: 0.5"
                  required
                  data-testid="ingredient-quantity-input"
                />
                {ingredientForm.material_id && (
                  <p className="text-xs text-zinc-500">
                    Unité: {materials.find(m => m.id === ingredientForm.material_id)?.unit}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsIngredientDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="bg-[#002FA7] hover:bg-[#002482]"
                disabled={!ingredientForm.material_id || !ingredientForm.quantity}
                data-testid="ingredient-submit-btn"
              >
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Labor Dialog */}
      <Dialog open={isLaborDialogOpen} onOpenChange={setIsLaborDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="labor-dialog">
          <DialogHeader>
            <DialogTitle>Ajouter un coût de main d'œuvre</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLabor}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={laborForm.description}
                  onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })}
                  placeholder="Ex: Préparation"
                  required
                  data-testid="labor-description-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heures *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={laborForm.hours}
                    onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })}
                    placeholder="1.5"
                    required
                    data-testid="labor-hours-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taux horaire (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={laborForm.hourly_rate}
                    onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: e.target.value })}
                    placeholder="15.00"
                    required
                    data-testid="labor-rate-input"
                  />
                </div>
              </div>
              {laborForm.hours && laborForm.hourly_rate && (
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-600">
                    Coût estimé: <span className="font-mono font-semibold">
                      {(parseFloat(laborForm.hours) * parseFloat(laborForm.hourly_rate)).toFixed(2)} €
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLaborDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                className="bg-[#002FA7] hover:bg-[#002482]"
                data-testid="labor-submit-btn"
              >
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Overheads Dialog */}
      <Dialog open={isOverheadDialogOpen} onOpenChange={setIsOverheadDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="manage-overheads-dialog">
          <DialogHeader>
            <DialogTitle>Gérer les frais généraux</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {overheads.length === 0 ? (
              <p className="text-center text-zinc-500 py-4">
                Aucun frais général disponible. <a href="/overheads" className="underline text-[#002FA7]">Créez-en d'abord</a>
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {overheads.map((overhead) => (
                  <div 
                    key={overhead.id}
                    className="flex items-center space-x-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50"
                    data-testid={`overhead-checkbox-${overhead.id}`}
                  >
                    <Checkbox
                      id={overhead.id}
                      checked={selectedOverheads.includes(overhead.id)}
                      onCheckedChange={() => toggleOverhead(overhead.id)}
                    />
                    <label 
                      htmlFor={overhead.id}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium text-zinc-900">{overhead.name}</p>
                      <p className="text-xs text-zinc-500">
                        {overhead.monthly_amount.toFixed(2)} €/mois • {overhead.category}
                      </p>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOverheadDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveOverheads}
              className="bg-[#002FA7] hover:bg-[#002482]"
              data-testid="save-overheads-btn"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipeDetail;
