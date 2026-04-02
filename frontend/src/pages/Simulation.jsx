import { useState, useEffect } from "react";
import axios from "axios";
import { TrendUp, TrendDown, Faders, Lightning, Package } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Simulation = () => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [changePercent, setChangePercent] = useState("10");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/materials`).then(r => setMaterials(r.data)).catch(() => {});
  }, []);

  const handleSimulate = async () => {
    if (!selectedMaterial) return toast.error("Selectionnez une matiere premiere");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/simulation/what-if`, {
        material_id: selectedMaterial,
        price_change_pct: parseFloat(changePercent),
      });
      setResult(res.data);
    } catch {
      toast.error("Erreur lors de la simulation");
    } finally {
      setLoading(false);
    }
  };

  const mat = materials.find(m => m.id === selectedMaterial);

  return (
    <div className="fade-in" data-testid="simulation-page">
      <div className="mb-6">
        <h1 className="page-title" data-testid="simulation-title">Simulation (What-If)</h1>
        <p className="page-subtitle">Simulez l'impact d'une variation de prix sur vos recettes</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg p-6 mb-6" data-testid="simulation-form">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label>Matiere premiere</Label>
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger data-testid="sim-material-select"><SelectValue placeholder="Choisir une matiere..." /></SelectTrigger>
              <SelectContent>
                {materials.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit_price} EUR/{m.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-2">
            <Label>Variation (%)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={changePercent} onChange={e => setChangePercent(e.target.value)} className="text-center" data-testid="sim-percent-input" />
              <span className="text-zinc-400">%</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[5, 10, 15, 20, -5, -10].map(p => (
              <button key={p} onClick={() => setChangePercent(p.toString())}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${changePercent === p.toString() ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 hover:bg-zinc-50"}`}
                data-testid={"sim-preset-" + p}>
                {p > 0 ? "+" : ""}{p}%
              </button>
            ))}
          </div>
          <Button onClick={handleSimulate} disabled={loading} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="sim-run-btn">
            <Lightning size={18} className="mr-2" /> {loading ? "Calcul..." : "Simuler"}
          </Button>
        </div>
      </div>

      {result && (
        <div data-testid="simulation-results">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <p className="text-xs text-zinc-400 mb-1">Matiere</p>
              <p className="font-bold text-lg">{result.material_name}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <p className="text-xs text-zinc-400 mb-1">Prix actuel → Nouveau prix</p>
              <p className="font-mono">
                <span className="text-zinc-600">{result.original_price.toFixed(2)} EUR</span>
                <span className="mx-2">→</span>
                <span className={`font-bold ${result.price_change_pct > 0 ? "text-red-600" : "text-green-600"}`}>{result.new_price.toFixed(2)} EUR</span>
              </p>
            </div>
            <div className={`rounded-lg p-4 border ${result.price_change_pct > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <p className="text-xs text-zinc-400 mb-1">Recettes impactees</p>
              <p className="font-bold text-2xl flex items-center gap-2">
                {result.price_change_pct > 0 ? <TrendUp size={24} className="text-red-500" /> : <TrendDown size={24} className="text-green-500" />}
                {result.impacted_recipes}
              </p>
            </div>
          </div>

          {result.impacts.length > 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-medium">Recette</th>
                    <th className="text-left py-3 px-2 font-medium">Client</th>
                    <th className="text-center py-3 px-2 font-medium">Ver.</th>
                    <th className="text-right py-3 px-3 font-medium">Cout actuel</th>
                    <th className="text-right py-3 px-3 font-medium">Nouveau cout</th>
                    <th className="text-right py-3 px-3 font-medium">Ecart</th>
                    <th className="text-right py-3 px-3 font-medium">Impact %</th>
                    <th className="text-right py-3 px-3 font-medium">Ancien prix vente</th>
                    <th className="text-right py-3 px-3 font-medium">Nouveau prix vente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {result.impacts.map((impact, i) => (
                    <tr key={impact.recipe_id} className="hover:bg-zinc-50" data-testid={"impact-row-" + i}>
                      <td className="py-3 px-4 font-medium">{impact.recipe_name}</td>
                      <td className="py-3 px-2 text-zinc-500 text-xs">{impact.supplier_name || "-"}</td>
                      <td className="text-center py-3 px-2">
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-mono">v{impact.version}</span>
                      </td>
                      <td className="text-right py-3 px-3 font-mono">{impact.current_cost_per_unit.toFixed(2)} EUR</td>
                      <td className="text-right py-3 px-3 font-mono font-bold">{impact.new_cost_per_unit.toFixed(2)} EUR</td>
                      <td className={`text-right py-3 px-3 font-mono font-bold ${impact.cost_diff > 0 ? "text-red-600" : "text-green-600"}`}>
                        {impact.cost_diff > 0 ? "+" : ""}{impact.cost_diff.toFixed(2)} EUR
                      </td>
                      <td className={`text-right py-3 px-3 font-bold ${impact.cost_diff_pct > 0 ? "text-red-600" : "text-green-600"}`}>
                        {impact.cost_diff_pct > 0 ? "+" : ""}{impact.cost_diff_pct}%
                      </td>
                      <td className="text-right py-3 px-3 font-mono text-zinc-500">{impact.current_suggested_price.toFixed(2)} EUR</td>
                      <td className="text-right py-3 px-3 font-mono font-bold">{impact.new_suggested_price.toFixed(2)} EUR</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center">
              <Package size={48} className="mx-auto mb-3 text-zinc-300" />
              <p className="text-zinc-500">Aucune recette n'utilise cette matiere premiere</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Simulation;
