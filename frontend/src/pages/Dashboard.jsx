import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Package, CookingPot, Gear, Truck, Calculator, TrendUp, TreeStructure, ChartPie, ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const CHART_COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9", "#F97316"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [allCosts, setAllCosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(API + "/dashboard/stats").then(r => setStats(r.data)).catch(() => {}),
      axios.get(API + "/reports/all-costs").then(r => setAllCosts(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  const statCards = [
    { label: "Matieres premieres", value: stats?.total_materials || 0, icon: Package, gradient: "from-blue-500 to-blue-700", lightBg: "bg-blue-50", textAccent: "text-blue-600" },
    { label: "Recettes", value: stats?.total_recipes || 0, icon: CookingPot, gradient: "from-emerald-500 to-emerald-700", lightBg: "bg-emerald-50", textAccent: "text-emerald-600" },
    { label: "Frais generaux", value: stats?.total_overheads || 0, icon: Gear, gradient: "from-amber-500 to-amber-700", lightBg: "bg-amber-50", textAccent: "text-amber-600" },
    { label: "Fournisseurs", value: stats?.total_suppliers || 0, icon: Truck, gradient: "from-violet-500 to-violet-700", lightBg: "bg-violet-50", textAccent: "text-violet-600" },
    { label: "Cout moyen/unite", value: (stats?.avg_cost_per_unit || 0).toFixed(2) + " EUR", icon: Calculator, gradient: "from-rose-500 to-rose-700", lightBg: "bg-rose-50", textAccent: "text-rose-600" },
  ];

  const costBreakdownData = allCosts.map(c => ({
    name: c.name?.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
    fullName: c.name,
    matieres: c.material_cost || 0,
    main_oeuvre: c.labor_cost || 0,
    frais: c.overhead_cost || 0,
    total: c.total_cost || 0,
    prix_vente: c.suggested_price || 0,
  }));

  const pieData = allCosts.length > 0 ? [
    { name: "Matieres", value: allCosts.reduce((s, c) => s + (c.material_cost || 0), 0) },
    { name: "Main d'oeuvre", value: allCosts.reduce((s, c) => s + (c.labor_cost || 0), 0) },
    { name: "Frais generaux", value: allCosts.reduce((s, c) => s + (c.overhead_cost || 0), 0) },
  ].filter(d => d.value > 0) : [];

  const marginData = allCosts.map(c => ({
    name: c.name?.length > 12 ? c.name.substring(0, 12) + "..." : c.name,
    marge: c.target_margin || 30,
    prix_revient: c.cost_per_unit || 0,
    prix_vente: c.suggested_price || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-zinc-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-zinc-900 text-sm mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) + " EUR" : p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in" data-testid="dashboard-page">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="page-title" data-testid="dashboard-title">
          Bonjour, {user?.name || "Utilisateur"}
        </h1>
        <p className="page-subtitle">Vue d'ensemble de votre activite</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8" data-testid="stat-cards">
        {statCards.map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${card.gradient} text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5`} data-testid={"stat-card-" + i}>
            <div className="absolute top-0 right-0 opacity-10">
              <card.icon size={80} weight="bold" className="translate-x-3 -translate-y-3" />
            </div>
            <div className="relative z-10">
              <card.icon size={24} weight="duotone" className="mb-3 opacity-90" />
              <p className="text-3xl font-bold font-mono tracking-tight">{card.value}</p>
              <p className="text-sm mt-1 opacity-80 font-medium">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Bar Chart - Cost Breakdown by Recipe */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6" data-testid="cost-bar-chart">
          <h3 className="font-semibold text-zinc-900 mb-4">Decomposition des couts par recette</h3>
          {costBreakdownData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">Aucune recette avec des couts</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costBreakdownData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v + " EUR"} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="matieres" name="Matieres" fill="#002FA7" radius={[2, 2, 0, 0]} stackId="cost" />
                <Bar dataKey="main_oeuvre" name="Main d'oeuvre" fill="#10B981" radius={[0, 0, 0, 0]} stackId="cost" />
                <Bar dataKey="frais" name="Frais gen." fill="#F59E0B" radius={[2, 2, 0, 0]} stackId="cost" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="cost-pie-chart">
          <h3 className="font-semibold text-zinc-900 mb-4">Repartition globale</h3>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">Aucune donnee</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%"} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => v.toFixed(2) + " EUR"} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-xs text-zinc-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Area Chart - Prix revient vs Prix vente */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="price-comparison-chart">
          <h3 className="font-semibold text-zinc-900 mb-4">Prix de revient vs Prix de vente</h3>
          {marginData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">Aucune donnee</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={marginData}>
                <defs>
                  <linearGradient id="gradRevient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#002FA7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#002FA7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVente" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v + " EUR"} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="prix_revient" name="Prix revient" stroke="#002FA7" fill="url(#gradRevient)" strokeWidth={2} />
                <Area type="monotone" dataKey="prix_vente" name="Prix vente" stroke="#10B981" fill="url(#gradVente)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent recipes with cost badges */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="recent-recipes">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-900">Dernieres recettes</h3>
            <Button variant="outline" size="sm" onClick={() => navigate("/recipes")} data-testid="view-all-recipes-btn">
              Voir tout <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
          {(!stats?.recent_recipes || stats.recent_recipes.length === 0) ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <CookingPot size={40} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucune recette</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_recipes.map((recipe, i) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => navigate("/recipes/" + recipe.id)}
                  data-testid={"recent-recipe-" + i}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "20" }}>
                      <CookingPot size={18} style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 text-sm">{recipe.name}</p>
                      <p className="text-xs text-zinc-500">par {recipe.output_unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-zinc-900">{recipe.cost_per_unit.toFixed(2)} EUR</p>
                    <p className="text-xs font-mono text-green-600">{recipe.suggested_price.toFixed(2)} EUR vente</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="quick-actions">
        <button onClick={() => navigate("/materials")} className="p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl hover:shadow-lg transition-shadow" data-testid="quick-materials">
          <Package size={28} className="mb-2" weight="duotone" />
          <p className="font-semibold text-sm">Matieres premieres</p>
          <p className="text-xs text-blue-100 mt-1">Gerer le catalogue</p>
        </button>
        <button onClick={() => navigate("/recipes")} className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl hover:shadow-lg transition-shadow" data-testid="quick-recipes">
          <CookingPot size={28} className="mb-2" weight="duotone" />
          <p className="font-semibold text-sm">Recettes</p>
          <p className="text-xs text-emerald-100 mt-1">Calculer les couts</p>
        </button>
        <button onClick={() => navigate("/bom")} className="p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-xl hover:shadow-lg transition-shadow" data-testid="quick-bom">
          <TreeStructure size={28} className="mb-2" weight="duotone" />
          <p className="font-semibold text-sm">Arbre fabrication</p>
          <p className="text-xs text-amber-100 mt-1">Visualiser la structure</p>
        </button>
        <button onClick={() => navigate("/costs-table")} className="p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl hover:shadow-lg transition-shadow" data-testid="quick-costs">
          <ChartPie size={28} className="mb-2" weight="duotone" />
          <p className="font-semibold text-sm">Tableau des couts</p>
          <p className="text-xs text-purple-100 mt-1">Exporter en Excel</p>
        </button>
      </div>
    </div>
  );
}
