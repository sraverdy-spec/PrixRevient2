import { useState, useEffect } from "react";
import axios from "axios";
import { Table, DownloadSimple, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CostsTable = () => {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCosts(); }, []);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/all-costs`);
      setCosts(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des coûts");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    window.open(`${API}/reports/export-excel`, '_blank');
    toast.success("Export en cours...");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  return (
    <div className="fade-in" data-testid="costs-table-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Tableau des Coûts</h1>
          <p className="page-subtitle">Vue complète de tous les coûts par recette</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchCosts}>
            <ArrowsClockwise size={18} className="mr-2" /> Actualiser
          </Button>
          <Button onClick={exportExcel} className="bg-[#10B981] hover:bg-[#059669]">
            <DownloadSimple size={18} className="mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {costs.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <Table size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune donnée</p>
          <p className="empty-state-text">Créez des recettes pour voir le tableau des coûts</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto">
          <table className="data-table min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-50">
                <th className="sticky left-0 bg-zinc-50 z-10">Recette</th>
                <th>Fournisseur</th>
                <th className="text-center">Ver.</th>
                <th className="text-right">Qté</th>
                <th className="text-right">Matières</th>
                <th className="text-right">Main d'œuvre</th>
                <th className="text-right">Frais gén.</th>
                <th className="text-right">Freinte</th>
                <th className="text-right bg-zinc-100 font-bold">Coût Total</th>
                <th className="text-right bg-zinc-100 font-bold">Prix/Unité</th>
                <th className="text-right">Marge %</th>
                <th className="text-right bg-green-50 font-bold">Prix Vente</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost, index) => (
                <tr key={cost.recipe_id} className="hover:bg-zinc-50" data-testid={`cost-row-${index}`}>
                  <td className="sticky left-0 bg-white z-10 font-medium border-r border-zinc-100">
                    {cost.recipe_name}
                  </td>
                  <td className="text-sm text-zinc-500">{cost.supplier_name || "-"}</td>
                  <td className="text-center"><span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-mono">v{cost.version || 1}</span></td>
                  <td className="text-right text-sm text-zinc-500">{cost.output_quantity} {cost.output_unit}</td>
                  <td className="text-right font-mono">{cost.material_cost.toFixed(2)} €</td>
                  <td className="text-right font-mono text-[#10B981]">{cost.labor_cost.toFixed(2)} €</td>
                  <td className="text-right font-mono text-[#F59E0B]">{cost.overhead_cost.toFixed(2)} €</td>
                  <td className="text-right font-mono text-red-500">{cost.freinte_cost.toFixed(2)} €</td>
                  <td className="text-right font-mono font-bold bg-zinc-50">{cost.total_cost.toFixed(2)} €</td>
                  <td className="text-right font-mono font-bold bg-zinc-50 text-[#002FA7]">{cost.cost_per_unit.toFixed(2)} €</td>
                  <td className="text-right">{cost.target_margin}%</td>
                  <td className="text-right font-mono font-bold bg-green-50 text-[#10B981]">{cost.suggested_price.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-100 font-bold">
                <td className="sticky left-0 bg-zinc-100 z-10">TOTAUX</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right font-mono">{costs.reduce((sum, c) => sum + c.material_cost, 0).toFixed(2)} €</td>
                <td className="text-right font-mono text-[#10B981]">{costs.reduce((sum, c) => sum + c.labor_cost, 0).toFixed(2)} €</td>
                <td className="text-right font-mono text-[#F59E0B]">{costs.reduce((sum, c) => sum + c.overhead_cost, 0).toFixed(2)} €</td>
                <td className="text-right font-mono text-red-500">{costs.reduce((sum, c) => sum + c.freinte_cost, 0).toFixed(2)} €</td>
                <td className="text-right font-mono">{costs.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)} €</td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-white border border-zinc-200 rounded-lg">
        <h3 className="font-semibold text-zinc-900 mb-3">Légende des colonnes</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="font-medium">Matières :</span> Coût des matières premières</div>
          <div><span className="font-medium text-[#10B981]">Main d'œuvre :</span> Coût du travail (heures × taux)</div>
          <div><span className="font-medium text-[#F59E0B]">Frais gén. :</span> Frais généraux répartis</div>
          <div><span className="font-medium text-red-500">Freinte :</span> Pertes/déchets sur matières</div>
        </div>
      </div>
    </div>
  );
};

export default CostsTable;
