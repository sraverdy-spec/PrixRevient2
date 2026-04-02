import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Package, CookingPot, Gear, Truck, Calculator, TrendUp, TreeStructure, ChartPie, ArrowRight, Warning, ArrowUp, ArrowDown, Users, ClockCounterClockwise, CheckCircle, XCircle, Database, MapPin, ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LineChart, Line } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const CHART_COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#0EA5E9", "#F97316"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [allCosts, setAllCosts] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [
      axios.get(API + "/dashboard/stats").then(r => setStats(r.data)).catch(() => {}),
      axios.get(API + "/reports/all-costs").then(r => setAllCosts(r.data)).catch(() => {}),
      axios.get(API + "/price-history?days=90").then(r => setPriceHistory(r.data)).catch(() => {}),
      axios.get(API + "/price-history/alerts").then(r => setPriceAlerts(r.data)).catch(() => {}),
    ];
    if (user?.role === "admin") {
      fetches.push(axios.get(API + "/dashboard/admin-stats").then(r => setAdminStats(r.data)).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user?.role]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  const statCards = [
    { label: "Matieres premieres", value: stats?.total_materials || 0, icon: Package, gradient: "from-blue-500 to-blue-700", lightBg: "bg-blue-50", textAccent: "text-blue-600" },
    { label: "Recettes", value: stats?.total_recipes || 0, icon: CookingPot, gradient: "from-emerald-500 to-emerald-700", lightBg: "bg-emerald-50", textAccent: "text-emerald-600" },
    { label: "Frais generaux", value: stats?.total_overheads || 0, icon: Gear, gradient: "from-amber-500 to-amber-700", lightBg: "bg-amber-50", textAccent: "text-amber-600" },
    { label: "Clients", value: stats?.total_suppliers || 0, icon: Truck, gradient: "from-violet-500 to-violet-700", lightBg: "bg-violet-50", textAccent: "text-violet-600" },
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

  // Build price evolution chart data: group by date, one line per recipe
  const evolutionData = (() => {
    if (!priceHistory || priceHistory.length === 0) return { chartData: [], recipeNames: [] };
    const byDate = {};
    const recipeSet = new Set();
    priceHistory.forEach(entry => {
      const date = (entry.recorded_at || "").substring(0, 10);
      if (!date) return;
      const name = entry.recipe_name || "Inconnu";
      recipeSet.add(name);
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][name] = entry.cost_per_unit || 0;
    });
    const dates = Object.keys(byDate).sort();
    return { chartData: dates.map(d => byDate[d]), recipeNames: [...recipeSet] };
  })();

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

      {/* Price Evolution & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Line Chart - Price Evolution */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6" data-testid="price-evolution-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <TrendUp size={20} className="text-[#002FA7]" /> Evolution des prix de revient (90j)
            </h3>
          </div>
          {evolutionData.chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <TrendUp size={40} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucun historique de prix enregistre</p>
                <p className="text-xs mt-1">Configurez une tache planifiee "Historique prix" dans Parametres</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolutionData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => { const d = new Date(v); return d.getDate() + "/" + (d.getMonth()+1); }} />
                <YAxis tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={v => new Date(v).toLocaleDateString("fr-FR")}
                  formatter={(v) => [v.toFixed(2) + " EUR", ""]}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {evolutionData.recipeNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Price Alerts */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="price-alerts-panel">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4">
            <Warning size={20} className="text-amber-500" /> Alertes prix matieres
          </h3>
          {priceAlerts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <Warning size={40} className="mx-auto mb-2 text-zinc-300" />
                <p>Aucune alerte</p>
                <p className="text-xs mt-1">Les alertes apparaissent quand un prix varie au-dela du seuil</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {priceAlerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-lg border ${alert.type === "hausse" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`} data-testid={"price-alert-" + i}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {alert.type === "hausse"
                        ? <ArrowUp size={16} className="text-red-600" weight="bold" />
                        : <ArrowDown size={16} className="text-green-600" weight="bold" />
                      }
                      <span className="font-medium text-sm text-zinc-900">{alert.material_name}</span>
                    </div>
                    <span className={`text-sm font-mono font-bold ${alert.type === "hausse" ? "text-red-600" : "text-green-600"}`}>
                      {alert.change_pct > 0 ? "+" : ""}{alert.change_pct}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {alert.old_price.toFixed(2)} EUR &rarr; {alert.new_price.toFixed(2)} EUR
                    {alert.supplier_name && <span> | {alert.supplier_name}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && adminStats && (
        <div className="mb-6" data-testid="admin-section">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={22} className="text-[#002FA7]" weight="duotone" />
            <h2 className="text-lg font-semibold text-zinc-900">Administration</h2>
          </div>

          {/* Admin KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white border border-zinc-200 rounded-xl p-4" data-testid="admin-users-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg"><Users size={18} className="text-blue-600" /></div>
                <span className="text-sm font-medium text-zinc-600">Utilisateurs</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-mono">{adminStats.active_users}<span className="text-sm font-normal text-zinc-400">/{adminStats.total_users}</span></p>
              <div className="flex gap-3 mt-2">
                {Object.entries(adminStats.users_by_role || {}).map(([role, count]) => (
                  <span key={role} className="text-xs text-zinc-500">{role}: <strong>{count}</strong></span>
                ))}
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4" data-testid="admin-imports-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg"><Database size={18} className="text-emerald-600" /></div>
                <span className="text-sm font-medium text-zinc-600">Imports</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-mono">{adminStats.total_imports}</p>
              <div className="flex gap-3 mt-2">
                <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> {adminStats.success_imports}</span>
                <span className="text-xs text-red-500 flex items-center gap-1"><XCircle size={12} /> {adminStats.error_imports}</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4" data-testid="admin-sites-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 rounded-lg"><MapPin size={18} className="text-amber-600" /></div>
                <span className="text-sm font-medium text-zinc-600">Sites</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-mono">{adminStats.total_sites}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4" data-testid="admin-stock-alerts-card">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-50 rounded-lg"><Warning size={18} className="text-red-500" /></div>
                <span className="text-sm font-medium text-zinc-600">Alertes stock</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-mono">{adminStats.low_stock_items?.length || 0}</p>
              {adminStats.low_stock_items?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {adminStats.low_stock_items.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-red-600 truncate">{item.name}: {item.stock_quantity} {item.unit}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Admin Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recipes by Category */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="admin-recipes-by-cat">
              <h3 className="font-semibold text-zinc-900 text-sm mb-3">Recettes par categorie</h3>
              {(adminStats.recipes_by_category || []).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">Aucune donnee</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={adminStats.recipes_by_category} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={v => [v, "Recettes"]} />
                    <Bar dataKey="count" fill="#002FA7" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent Imports */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="admin-recent-imports">
              <h3 className="font-semibold text-zinc-900 text-sm mb-3 flex items-center gap-2">
                <ClockCounterClockwise size={16} className="text-zinc-500" /> Derniers imports
              </h3>
              {(adminStats.recent_imports || []).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">Aucun import</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {adminStats.recent_imports.slice(0, 6).map((imp, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {imp.status === "success"
                          ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                          : <XCircle size={14} className="text-red-500 flex-shrink-0" />
                        }
                        <span className="text-xs text-zinc-700 truncate">{imp.filename || imp.type}</span>
                      </div>
                      <span className="text-xs text-zinc-400 flex-shrink-0 ml-2">
                        {imp.timestamp ? new Date(imp.timestamp).toLocaleDateString("fr-FR") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crontab Status */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="admin-crontab-status">
              <h3 className="font-semibold text-zinc-900 text-sm mb-3 flex items-center gap-2">
                <Gear size={16} className="text-zinc-500" /> Taches planifiees
              </h3>
              {(adminStats.crontab_summary || []).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">Aucune tache configuree</p>
              ) : (
                <div className="space-y-2.5">
                  {adminStats.crontab_summary.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.enabled ? "bg-green-500" : "bg-zinc-300"}`} />
                        <span className="text-xs text-zinc-700 truncate">{c.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        c.last_status === "success" ? "bg-green-50 text-green-700" :
                        c.last_status === "error" ? "bg-red-50 text-red-700" :
                        "bg-zinc-50 text-zinc-500"
                      }`}>
                        {c.last_status || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
