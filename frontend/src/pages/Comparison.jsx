import { useState, useEffect } from "react";
import axios from "axios";
import { ChartBar, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Comparison = () => {
  const [recipes, setRecipes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des recettes");
    }
  };

  const addRecipe = (id) => {
    if (id && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeRecipe = (id) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
    setComparisonData(comparisonData.filter(d => d.recipe_id !== id));
  };

  const compare = async () => {
    if (selectedIds.length < 2) {
      toast.error("Sélectionnez au moins 2 recettes");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/recipes/compare`, selectedIds);
      setComparisonData(response.data);
    } catch (error) {
      toast.error("Erreur lors de la comparaison");
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (d) => {
    let label = d.recipe_name;
    label += ` v${d.version || 1}`;
    if (d.supplier_name) label += ` (${d.supplier_name})`;
    return label;
  };

  const chartData = comparisonData.map(d => {
    const label = getLabel(d);
    return {
      name: label.length > 25 ? label.substring(0, 25) + "..." : label,
      "Matières": d.material_cost,
      "Main d'œuvre": d.labor_cost,
      "Frais généraux": d.overhead_cost,
      "Prix/Unité": d.cost_per_unit
    };
  });

  return (
    <div className="fade-in" data-testid="comparison-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Comparaison de Recettes</h1>
          <p className="page-subtitle">Comparez les coûts de plusieurs produits</p>
        </div>
      </div>

      {/* Selection */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Sélection des recettes à comparer</h3>
        <div className="flex gap-4 mb-4">
          <Select onValueChange={addRecipe}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Ajouter une recette..." />
            </SelectTrigger>
            <SelectContent>
              {recipes.filter(r => !selectedIds.includes(r.id)).map((recipe) => (
                <SelectItem key={recipe.id} value={recipe.id}>
                  {recipe.name} v{recipe.version || 1}{recipe.supplier_name ? ` - ${recipe.supplier_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={compare} disabled={selectedIds.length < 2 || loading} className="bg-[#002FA7] hover:bg-[#002482]">
            {loading ? "Chargement..." : "Comparer"}
          </Button>
        </div>

        {/* Selected recipes */}
        <div className="flex flex-wrap gap-2">
          {selectedIds.map(id => {
            const recipe = recipes.find(r => r.id === id);
            return recipe ? (
              <div key={id} className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full">
                <span className="text-sm">{recipe.name} <span className="text-xs text-blue-600 font-mono">v{recipe.version || 1}</span>{recipe.supplier_name ? <span className="text-xs text-zinc-400"> - {recipe.supplier_name}</span> : ""}</span>
                <button onClick={() => removeRecipe(id)} className="hover:text-red-500">
                  <Trash size={14} />
                </button>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Chart */}
          <div className="bg-white border border-zinc-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Graphique comparatif</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}€`} />
                <Tooltip formatter={(value) => `${value.toFixed(2)} €`} />
                <Legend />
                <Bar dataKey="Matières" fill="#002FA7" />
                <Bar dataKey="Main d'œuvre" fill="#10B981" />
                <Bar dataKey="Frais généraux" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recette</th>
                  <th>Fournisseur</th>
                  <th className="text-center">Version</th>
                  <th className="text-right">Matières</th>
                  <th className="text-right">Main d'œuvre</th>
                  <th className="text-right">Frais gén.</th>
                  <th className="text-right">Coût Total</th>
                  <th className="text-right">Prix/Unité</th>
                  <th className="text-right">Prix Vente</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((data, index) => (
                  <tr key={data.recipe_id} data-testid={`comparison-row-${index}`}>
                    <td className="font-medium">{data.recipe_name}</td>
                    <td className="text-sm text-zinc-500">{data.supplier_name || "-"}</td>
                    <td className="text-center"><span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-mono">v{data.version || 1}</span></td>
                    <td className="text-right font-mono">{data.material_cost.toFixed(2)} €</td>
                    <td className="text-right font-mono text-[#10B981]">{data.labor_cost.toFixed(2)} €</td>
                    <td className="text-right font-mono text-[#F59E0B]">{data.overhead_cost.toFixed(2)} €</td>
                    <td className="text-right font-mono">{data.total_cost.toFixed(2)} €</td>
                    <td className="text-right font-mono font-bold text-[#002FA7]">{data.cost_per_unit.toFixed(2)} €</td>
                    <td className="text-right font-mono font-bold text-[#10B981]">{data.suggested_price.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {comparisonData.length === 0 && selectedIds.length >= 2 && !loading && (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <ChartBar size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Cliquez sur "Comparer"</p>
          <p className="empty-state-text">Pour voir la comparaison des recettes sélectionnées</p>
        </div>
      )}
    </div>
  );
};

export default Comparison;
