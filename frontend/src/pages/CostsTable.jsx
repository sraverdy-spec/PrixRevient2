import { useState, useEffect } from "react";
import axios from "axios";
import { Table, DownloadSimple, ArrowsClockwise, Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRODUCT_TYPES = [
  { value: "MDD", label: "MDD", color: "bg-blue-100 text-blue-700" },
  { value: "MN", label: "MN", color: "bg-emerald-100 text-emerald-700" },
  { value: "SM", label: "SM", color: "bg-zinc-100 text-zinc-700" },
  { value: "MP", label: "MP", color: "bg-violet-100 text-violet-700" },
];

const CostsTable = () => {
  const [costs, setCosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchCosts(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    try { setCategories((await axios.get(`${API}/categories`)).data); } catch {}
  };

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

  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || "";
  const uniqueClients = [...new Set(costs.map(c => c.supplier_name || "").filter(Boolean))];
  const uniqueTypes = [...new Set(costs.map(c => c.product_type || "").filter(Boolean))];
  const uniqueCats = [...new Set(costs.map(c => c.category_id || "").filter(Boolean))];

  const filteredCosts = costs.filter(c => {
    if (filterClient !== "all" && (c.supplier_name || "") !== filterClient) return false;
    if (filterType !== "all" && (c.product_type || "") !== filterType) return false;
    if (filterCategory !== "all" && (c.category_id || "") !== filterCategory) return false;
    if (searchQuery && !c.recipe_name.toLowerCase().includes(searchQuery.toLowerCase()) && !(c.code_article || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fade-in" data-testid="costs-table-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Tableau des Couts</h1>
          <p className="page-subtitle">Vue complete de tous les couts par recette</p>
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

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3" data-testid="costs-filters">
        <div className="flex items-center gap-2">
          <MagnifyingGlass size={18} className="text-zinc-400" />
          <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 w-44" data-testid="costs-search" />
        </div>
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-zinc-400" />
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="h-9 w-40" data-testid="costs-filter-client"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {uniqueClients.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-36" data-testid="costs-filter-type"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {PRODUCT_TYPES.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-44" data-testid="costs-filter-category"><SelectValue placeholder="Categorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes categories</SelectItem>
            {uniqueCats.map(catId => <SelectItem key={catId} value={catId}>{getCategoryName(catId) || catId}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterClient !== "all" || filterType !== "all" || filterCategory !== "all" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterClient("all"); setFilterType("all"); setFilterCategory("all"); setSearchQuery(""); }}>
            Effacer
          </Button>
        )}
        <span className="text-sm text-zinc-400 ml-auto">{filteredCosts.length}/{costs.length}</span>
      </div>

      {filteredCosts.length === 0 ? (
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
                <th className="sticky left-0 bg-zinc-50 z-10 w-24">Code</th>
                <th className="sticky left-[96px] bg-zinc-50 z-10">Recette</th>
                <th>Client</th>
                <th className="text-center">Type</th>
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
              {filteredCosts.map((cost, index) => (
                <tr key={cost.recipe_id} className="hover:bg-zinc-50" data-testid={`cost-row-${index}`}>
                  <td className="sticky left-0 bg-white z-10 border-r border-zinc-100">
                    {cost.code_article ? (
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{cost.code_article}</span>
                    ) : <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="sticky left-[96px] bg-white z-10 font-medium border-r border-zinc-100">
                    {cost.recipe_name}
                  </td>
                  <td className="text-sm text-zinc-500">{cost.supplier_name || "-"}</td>
                  <td className="text-center">
                    {cost.product_type ? (() => {
                      const pt = PRODUCT_TYPES.find(p => p.value === cost.product_type);
                      return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pt?.color || "bg-zinc-100 text-zinc-600"}`}>{cost.product_type}</span>;
                    })() : <span className="text-zinc-300">-</span>}
                  </td>
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
                <td className="sticky left-0 bg-zinc-100 z-10"></td>
                <td className="sticky left-[96px] bg-zinc-100 z-10">TOTAUX</td>
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
