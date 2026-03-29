import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Plus, Trash, Calculator, Package, Clock, Gear,
  FilePdf, TreeStructure, Percent, CurrencyCircleDollar
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CHART_COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [overheads, setOverheads] = useState([]);
  const [intermediateRecipes, setIntermediateRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isIngredientDialogOpen, setIsIngredientDialogOpen] = useState(false);
  const [isSubRecipeDialogOpen, setIsSubRecipeDialogOpen] = useState(false);
  const [isLaborDialogOpen, setIsLaborDialogOpen] = useState(false);
  const [isOverheadDialogOpen, setIsOverheadDialogOpen] = useState(false);

  const [ingredientForm, setIngredientForm] = useState({ material_id: "", quantity: "" });
  const [subRecipeForm, setSubRecipeForm] = useState({ sub_recipe_id: "", quantity: "", unit: "unite" });
  const [laborForm, setLaborForm] = useState({ description: "", hours: "", hourly_rate: "" });
  const [selectedOverheads, setSelectedOverheads] = useState([]);

  const fetchRecipe = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`);
      setRecipe(response.data);
      setSelectedOverheads(response.data.overhead_ids || []);
    } catch {
      toast.error("Erreur lors du chargement de la recette");
      navigate("/recipes");
    }
  }, [id, navigate]);

  const fetchCostBreakdown = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}/cost`);
      setCostBreakdown(response.data);
    } catch {}
  }, [id]);

  const fetchMaterials = async () => {
    try { setMaterials((await axios.get(`${API}/materials`)).data); } catch {}
  };
  const fetchOverheads = async () => {
    try { setOverheads((await axios.get(`${API}/overheads`)).data); } catch {}
  };
  const fetchIntermediateRecipes = async () => {
    try { setIntermediateRecipes((await axios.get(`${API}/recipes/intermediate`)).data); } catch {}
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchRecipe(), fetchMaterials(), fetchOverheads(), fetchIntermediateRecipes()]);
      await fetchCostBreakdown();
      setLoading(false);
    };
    load();
  }, [fetchRecipe, fetchCostBreakdown]);

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    const material = materials.find(m => m.id === ingredientForm.material_id);
    if (!material) return;
    const newIng = {
      material_id: material.id,
      material_name: material.name,
      quantity: parseFloat(ingredientForm.quantity),
      unit: material.unit,
      unit_price: material.unit_price,
      freinte: material.freinte || 0,
      is_sub_recipe: false,
    };
    const updated = [...(recipe.ingredients || []), newIng];
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updated });
      toast.success("Ingredient ajoute");
      setIsIngredientDialogOpen(false);
      setIngredientForm({ material_id: "", quantity: "" });
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur lors de l'ajout"); }
  };

  const handleAddSubRecipe = async (e) => {
    e.preventDefault();
    const subRecipe = intermediateRecipes.find(r => r.id === subRecipeForm.sub_recipe_id);
    if (!subRecipe) return;
    // Prevent adding self
    if (subRecipe.id === id) {
      toast.error("Impossible d'ajouter la recette comme sous-recette d'elle-meme");
      return;
    }
    const newIng = {
      sub_recipe_id: subRecipe.id,
      material_name: subRecipe.name,
      quantity: parseFloat(subRecipeForm.quantity),
      unit: subRecipeForm.unit || subRecipe.output_unit || "unite",
      unit_price: 0, // computed by backend
      freinte: 0,
      is_sub_recipe: true,
    };
    const updated = [...(recipe.ingredients || []), newIng];
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updated });
      toast.success("Sous-recette ajoutee");
      setIsSubRecipeDialogOpen(false);
      setSubRecipeForm({ sub_recipe_id: "", quantity: "", unit: "unite" });
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur lors de l'ajout"); }
  };

  const handleRemoveIngredient = async (index) => {
    const updated = recipe.ingredients.filter((_, i) => i !== index);
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updated });
      toast.success("Element supprime");
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur"); }
  };

  const handleAddLabor = async (e) => {
    e.preventDefault();
    const newLabor = {
      description: laborForm.description,
      hours: parseFloat(laborForm.hours),
      hourly_rate: parseFloat(laborForm.hourly_rate),
    };
    const updated = [...(recipe.labor_costs || []), newLabor];
    try {
      await axios.put(`${API}/recipes/${id}`, { labor_costs: updated });
      toast.success("Cout main d'oeuvre ajoute");
      setIsLaborDialogOpen(false);
      setLaborForm({ description: "", hours: "", hourly_rate: "" });
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur"); }
  };

  const handleRemoveLabor = async (index) => {
    const updated = recipe.labor_costs.filter((_, i) => i !== index);
    try {
      await axios.put(`${API}/recipes/${id}`, { labor_costs: updated });
      toast.success("Cout supprime");
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur"); }
  };

  const handleSaveOverheads = async () => {
    try {
      await axios.put(`${API}/recipes/${id}`, { overhead_ids: selectedOverheads });
      toast.success("Frais generaux mis a jour");
      setIsOverheadDialogOpen(false);
      fetchRecipe(); fetchCostBreakdown();
    } catch { toast.error("Erreur"); }
  };

  const toggleOverhead = (ohId) => {
    setSelectedOverheads(prev => prev.includes(ohId) ? prev.filter(i => i !== ohId) : [...prev, ohId]);
  };

  const handleExportPdf = () => {
    window.open(`${API}/recipes/${id}/pdf`, '_blank');
    toast.success("Generation du PDF en cours...");
  };

  if (loading) return <div className="flex items-center justify-center h-64" data-testid="recipe-detail-loading"><div className="text-zinc-500">Chargement...</div></div>;
  if (!recipe) return null;

  const rawIngredients = (recipe.ingredients || []).filter(i => !i.is_sub_recipe);
  const subRecipeIngredients = (recipe.ingredients || []).filter(i => i.is_sub_recipe);
  const availableSubRecipes = intermediateRecipes.filter(r => r.id !== id);

  const pieData = costBreakdown ? [
    { name: "Matieres", value: costBreakdown.total_material_cost },
    { name: "Main d'oeuvre", value: costBreakdown.total_labor_cost },
    { name: "Frais generaux", value: costBreakdown.total_overhead_cost },
  ].filter(d => d.value > 0) : [];

  const barData = costBreakdown?.material_details?.map(m => ({
    name: m.name.length > 12 ? m.name.substring(0, 12) + "..." : m.name,
    cost: m.total_cost,
  })) || [];

  return (
    <div className="fade-in" data-testid="recipe-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/recipes")} data-testid="back-to-recipes-btn">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title" data-testid="recipe-detail-title">{recipe.name}</h1>
              {recipe.is_intermediate && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium flex items-center gap-1">
                  <TreeStructure size={12} /> Semi-fini
                </span>
              )}
            </div>
            <p className="page-subtitle">
              Produit: {recipe.output_quantity} {recipe.output_unit}
              {recipe.description && ` \u2022 ${recipe.description}`}
            </p>
          </div>
        </div>
        <Button onClick={handleExportPdf} className="bg-[#EF4444] hover:bg-[#DC2626]" data-testid="export-pdf-btn">
          <FilePdf size={20} className="mr-2" /> Exporter PDF
        </Button>
      </div>

      {/* Cost Summary Cards */}
      {costBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8" data-testid="cost-summary-cards">
          <div className="stat-card" data-testid="material-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-[#002FA7]" />
              <span className="stat-label">Matieres</span>
            </div>
            <div className="text-2xl font-bold font-mono">{costBreakdown.total_material_cost.toFixed(2)} EUR</div>
            {costBreakdown.total_freinte_cost > 0 && (
              <p className="text-xs text-red-500 mt-1">dont {costBreakdown.total_freinte_cost.toFixed(2)} EUR freinte</p>
            )}
          </div>
          <div className="stat-card" data-testid="labor-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-[#10B981]" />
              <span className="stat-label">Main d'oeuvre</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#10B981]">{costBreakdown.total_labor_cost.toFixed(2)} EUR</div>
          </div>
          <div className="stat-card" data-testid="overhead-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Gear size={18} className="text-[#F59E0B]" />
              <span className="stat-label">Frais generaux</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#F59E0B]">{costBreakdown.total_overhead_cost.toFixed(2)} EUR</div>
          </div>
          <div className="stat-card bg-[#002FA7]" data-testid="total-cost-card">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={18} className="text-white" />
              <span className="stat-label text-blue-100">Prix revient / unite</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{costBreakdown.cost_per_unit.toFixed(2)} EUR</div>
            <p className="text-xs text-blue-200 mt-1">Total: {costBreakdown.total_cost.toFixed(2)} EUR</p>
          </div>
          <div className="stat-card bg-[#10B981]" data-testid="suggested-price-card">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyCircleDollar size={18} className="text-white" />
              <span className="stat-label text-green-100">Prix vente (marge {costBreakdown.target_margin}%)</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">{costBreakdown.suggested_price.toFixed(2)} EUR</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingredients Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="ingredients-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Matieres premieres</h3>
              <Button size="sm" onClick={() => setIsIngredientDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-ingredient-btn">
                <Plus size={16} className="mr-1" /> Ajouter
              </Button>
            </div>
            {rawIngredients.length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-ingredients-message">
                <Package size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucune matiere premiere ajoutee</p>
              </div>
            ) : (
              <table className="data-table" data-testid="ingredients-table">
                <thead>
                  <tr>
                    <th>Matiere</th>
                    <th className="text-right">Quantite</th>
                    <th className="text-right">Prix/u</th>
                    <th className="text-right">Freinte</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rawIngredients.map((ing, index) => {
                    const baseCost = ing.quantity * ing.unit_price;
                    const freinteCost = baseCost * (ing.freinte || 0) / 100;
                    const totalCost = baseCost + freinteCost;
                    return (
                      <tr key={index} data-testid={`ingredient-row-${index}`}>
                        <td className="font-medium">{ing.material_name}</td>
                        <td className="text-right">{ing.quantity} {ing.unit}</td>
                        <td className="text-right font-mono">{ing.unit_price.toFixed(2)} EUR</td>
                        <td className="text-right">
                          {ing.freinte > 0 ? <span className="text-red-500">{ing.freinte}%</span> : <span className="text-zinc-400">-</span>}
                        </td>
                        <td className="text-right font-mono font-semibold">{totalCost.toFixed(2)} EUR</td>
                        <td className="text-right">
                          <button onClick={() => handleRemoveIngredient((recipe.ingredients || []).indexOf(ing))} className="p-1 hover:bg-red-50 rounded" data-testid={`remove-ingredient-${index}`}>
                            <Trash size={14} className="text-red-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Sub-Recipes Section */}
          <div className="bg-white border border-amber-200 rounded-lg" data-testid="sub-recipes-section">
            <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <TreeStructure size={20} className="text-amber-600" />
                <h3 className="font-semibold text-zinc-900">Articles semi-finis (sous-recettes)</h3>
              </div>
              <Button size="sm" onClick={() => setIsSubRecipeDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600" disabled={availableSubRecipes.length === 0} data-testid="add-sub-recipe-btn">
                <Plus size={16} className="mr-1" /> Ajouter
              </Button>
            </div>
            {subRecipeIngredients.length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-sub-recipes-message">
                <TreeStructure size={32} className="mx-auto mb-2 text-zinc-300" />
                <p className="text-sm">Aucun article semi-fini</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {availableSubRecipes.length === 0
                    ? "Creez d'abord des recettes marquees comme 'semi-fini'"
                    : "Ajoutez des sous-recettes pour construire votre arbre de fabrication"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3" data-testid="sub-recipes-list">
                {subRecipeIngredients.map((ing, index) => {
                  const subDetail = costBreakdown?.sub_recipe_details?.find(s => s.name === ing.material_name);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100" data-testid={`sub-recipe-row-${index}`}>
                      <div className="flex items-center gap-3">
                        <TreeStructure size={16} className="text-amber-600" />
                        <div>
                          <p className="font-medium text-zinc-900">{ing.material_name}</p>
                          <p className="text-xs text-zinc-500">{ing.quantity} {ing.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {subDetail && (
                          <span className="font-mono font-semibold text-amber-700">{subDetail.total_cost.toFixed(2)} EUR</span>
                        )}
                        <button onClick={() => handleRemoveIngredient((recipe.ingredients || []).indexOf(ing))} className="p-1 hover:bg-red-50 rounded">
                          <Trash size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Labor Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="labor-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Couts de main d'oeuvre</h3>
              <Button size="sm" onClick={() => setIsLaborDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-labor-btn">
                <Plus size={16} className="mr-1" /> Ajouter
              </Button>
            </div>
            {(recipe.labor_costs || []).length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-labor-message">
                <Clock size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun cout de main d'oeuvre</p>
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
                  {recipe.labor_costs.map((labor, index) => (
                    <tr key={index} data-testid={`labor-row-${index}`}>
                      <td className="font-medium">{labor.description}</td>
                      <td className="text-right">{labor.hours} h</td>
                      <td className="text-right font-mono">{labor.hourly_rate.toFixed(2)} EUR/h</td>
                      <td className="text-right font-mono font-semibold text-[#10B981]">{(labor.hours * labor.hourly_rate).toFixed(2)} EUR</td>
                      <td className="text-right">
                        <button onClick={() => handleRemoveLabor(index)} className="p-1 hover:bg-red-50 rounded" data-testid={`remove-labor-${index}`}>
                          <Trash size={14} className="text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Overhead Section */}
          <div className="bg-white border border-zinc-200 rounded-lg" data-testid="overhead-section">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Frais generaux affectes</h3>
              <Button size="sm" variant="outline" onClick={() => setIsOverheadDialogOpen(true)} data-testid="manage-overheads-btn">
                <Gear size={16} className="mr-1" /> Gerer
              </Button>
            </div>
            {(recipe.overhead_ids || []).length === 0 ? (
              <div className="p-8 text-center text-zinc-500" data-testid="no-overheads-message">
                <Gear size={32} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun frais general affecte</p>
              </div>
            ) : (
              <div className="p-4 space-y-2" data-testid="overheads-list">
                {costBreakdown?.overhead_details?.map((oh, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg" data-testid={`overhead-item-${index}`}>
                    <div>
                      <p className="font-medium text-zinc-900">{oh.name}</p>
                      <p className="text-xs text-zinc-500">{oh.category} - {oh.allocation_method}</p>
                    </div>
                    <span className="font-mono font-semibold text-[#F59E0B]">{oh.total_cost.toFixed(2)} EUR</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Charts & Summary */}
        <div className="space-y-6">
          {pieData.length > 0 && (
            <div className="chart-container" data-testid="cost-pie-chart">
              <h3 className="chart-title">Repartition des couts</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)} EUR`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {barData.length > 0 && (
            <div className="chart-container" data-testid="material-bar-chart">
              <h3 className="chart-title">Cout par matiere</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                  <XAxis type="number" tickFormatter={(v) => `${v}EUR`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value.toFixed(2)} EUR`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '8px' }} />
                  <Bar dataKey="cost" fill="#002FA7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Complete Cost Summary */}
          {costBreakdown && (
            <div className="chart-container" data-testid="cost-summary-breakdown">
              <h3 className="chart-title">Recapitulatif complet</h3>
              <div className="cost-breakdown">
                <div className="cost-row">
                  <span className="cost-label">Matieres premieres</span>
                  <span className="cost-value">{costBreakdown.total_material_cost.toFixed(2)} EUR</span>
                </div>
                {costBreakdown.total_freinte_cost > 0 && (
                  <div className="cost-row" style={{ background: '#FEF2F2' }}>
                    <span className="cost-label text-red-600">dont Freinte (pertes)</span>
                    <span className="cost-value text-red-600">{costBreakdown.total_freinte_cost.toFixed(2)} EUR</span>
                  </div>
                )}
                {costBreakdown.sub_recipe_details?.length > 0 && (
                  <div className="cost-row" style={{ background: '#FFFBEB' }}>
                    <span className="cost-label text-amber-700">dont Sous-recettes</span>
                    <span className="cost-value text-amber-700">
                      {costBreakdown.sub_recipe_details.reduce((s, d) => s + d.total_cost, 0).toFixed(2)} EUR
                    </span>
                  </div>
                )}
                <div className="cost-row">
                  <span className="cost-label">Main d'oeuvre</span>
                  <span className="cost-value text-[#10B981]">{costBreakdown.total_labor_cost.toFixed(2)} EUR</span>
                </div>
                <div className="cost-row">
                  <span className="cost-label">Frais generaux</span>
                  <span className="cost-value text-[#F59E0B]">{costBreakdown.total_overhead_cost.toFixed(2)} EUR</span>
                </div>
                <div className="cost-row cost-total">
                  <span className="cost-label">Cout total</span>
                  <span className="cost-value">{costBreakdown.total_cost.toFixed(2)} EUR</span>
                </div>
                <div className="mt-4 p-4 bg-zinc-900 rounded-lg text-center">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Prix de revient unitaire</p>
                  <p className="text-3xl font-bold text-white font-mono">{costBreakdown.cost_per_unit.toFixed(2)} EUR</p>
                  <p className="text-sm text-zinc-400 mt-1">par {costBreakdown.output_unit}</p>
                </div>
                <div className="mt-2 p-4 bg-[#10B981] rounded-lg text-center">
                  <p className="text-xs text-green-100 uppercase tracking-wider mb-1">Prix de vente conseille (marge {costBreakdown.target_margin}%)</p>
                  <p className="text-3xl font-bold text-white font-mono">{costBreakdown.suggested_price.toFixed(2)} EUR</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={isIngredientDialogOpen} onOpenChange={setIsIngredientDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="ingredient-dialog">
          <DialogHeader><DialogTitle>Ajouter une matiere premiere</DialogTitle></DialogHeader>
          <form onSubmit={handleAddIngredient}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Matiere premiere *</Label>
                <Select value={ingredientForm.material_id} onValueChange={(v) => setIngredientForm({ ...ingredientForm, material_id: v })}>
                  <SelectTrigger data-testid="ingredient-material-select"><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                  <SelectContent>
                    {materials.map((mat) => (
                      <SelectItem key={mat.id} value={mat.id}>
                        {mat.name} ({mat.unit_price.toFixed(2)} EUR/{mat.unit})
                        {mat.freinte > 0 && ` [F:${mat.freinte}%]`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {materials.length === 0 && <p className="text-sm text-amber-600">Aucune matiere. <a href="/materials" className="underline">Creez-en d'abord</a></p>}
              </div>
              <div className="space-y-2">
                <Label>Quantite *</Label>
                <Input type="number" step="0.001" min="0.001" value={ingredientForm.quantity} onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: e.target.value })} placeholder="Ex: 0.5" required data-testid="ingredient-quantity-input" />
                {ingredientForm.material_id && (() => {
                  const mat = materials.find(m => m.id === ingredientForm.material_id);
                  if (!mat) return null;
                  return (
                    <div className="p-2 bg-zinc-50 rounded text-sm">
                      <p className="text-zinc-600">Unite: {mat.unit} | Prix: {mat.unit_price.toFixed(2)} EUR/{mat.unit}</p>
                      {mat.freinte > 0 && <p className="text-red-500">Freinte: {mat.freinte}% (cout ajuste automatiquement)</p>}
                    </div>
                  );
                })()}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsIngredientDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" disabled={!ingredientForm.material_id || !ingredientForm.quantity} data-testid="ingredient-submit-btn">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Recipe Dialog */}
      <Dialog open={isSubRecipeDialogOpen} onOpenChange={setIsSubRecipeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="sub-recipe-dialog">
          <DialogHeader><DialogTitle>Ajouter un article semi-fini</DialogTitle></DialogHeader>
          <form onSubmit={handleAddSubRecipe}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Sous-recette *</Label>
                <Select value={subRecipeForm.sub_recipe_id} onValueChange={(v) => setSubRecipeForm({ ...subRecipeForm, sub_recipe_id: v })}>
                  <SelectTrigger data-testid="sub-recipe-select"><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                  <SelectContent>
                    {availableSubRecipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.output_quantity} {r.output_unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantite *</Label>
                  <Input type="number" step="0.001" min="0.001" value={subRecipeForm.quantity} onChange={(e) => setSubRecipeForm({ ...subRecipeForm, quantity: e.target.value })} required data-testid="sub-recipe-quantity-input" />
                </div>
                <div className="space-y-2">
                  <Label>Unite</Label>
                  <Input value={subRecipeForm.unit} onChange={(e) => setSubRecipeForm({ ...subRecipeForm, unit: e.target.value })} data-testid="sub-recipe-unit-input" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubRecipeDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600" disabled={!subRecipeForm.sub_recipe_id || !subRecipeForm.quantity} data-testid="sub-recipe-submit-btn">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Labor Dialog */}
      <Dialog open={isLaborDialogOpen} onOpenChange={setIsLaborDialogOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="labor-dialog">
          <DialogHeader><DialogTitle>Ajouter un cout de main d'oeuvre</DialogTitle></DialogHeader>
          <form onSubmit={handleAddLabor}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input value={laborForm.description} onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })} placeholder="Ex: Preparation" required data-testid="labor-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heures *</Label>
                  <Input type="number" step="0.25" min="0.25" value={laborForm.hours} onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })} placeholder="1.5" required data-testid="labor-hours-input" />
                </div>
                <div className="space-y-2">
                  <Label>Taux horaire (EUR) *</Label>
                  <Input type="number" step="0.01" min="0.01" value={laborForm.hourly_rate} onChange={(e) => setLaborForm({ ...laborForm, hourly_rate: e.target.value })} placeholder="15.00" required data-testid="labor-rate-input" />
                </div>
              </div>
              {laborForm.hours && laborForm.hourly_rate && (
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-600">
                    Cout estime: <span className="font-mono font-semibold">{(parseFloat(laborForm.hours) * parseFloat(laborForm.hourly_rate)).toFixed(2)} EUR</span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLaborDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="labor-submit-btn">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Overheads Dialog */}
      <Dialog open={isOverheadDialogOpen} onOpenChange={setIsOverheadDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="manage-overheads-dialog">
          <DialogHeader><DialogTitle>Gerer les frais generaux</DialogTitle></DialogHeader>
          <div className="py-4">
            {overheads.length === 0 ? (
              <p className="text-center text-zinc-500 py-4">Aucun frais disponible. <a href="/overheads" className="underline text-[#002FA7]">Creez-en d'abord</a></p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {overheads.map((oh) => (
                  <div key={oh.id} className="flex items-center space-x-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50" data-testid={`overhead-checkbox-${oh.id}`}>
                    <Checkbox id={oh.id} checked={selectedOverheads.includes(oh.id)} onCheckedChange={() => toggleOverhead(oh.id)} />
                    <label htmlFor={oh.id} className="flex-1 cursor-pointer">
                      <p className="font-medium text-zinc-900">{oh.name}</p>
                      <p className="text-xs text-zinc-500">{oh.monthly_amount.toFixed(2)} EUR/mois - {oh.category}</p>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOverheadDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveOverheads} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="save-overheads-btn">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipeDetail;
