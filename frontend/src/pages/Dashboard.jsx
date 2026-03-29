import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Package, 
  CookingPot, 
  Gear, 
  TrendUp,
  ArrowRight
} from "@phosphor-icons/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CHART_COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_materials: 0,
    total_recipes: 0,
    total_overheads: 0,
    avg_cost_per_unit: 0,
    recent_recipes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: "Matières Premières", 
      value: stats.total_materials, 
      icon: Package,
      color: "#002FA7"
    },
    { 
      label: "Recettes", 
      value: stats.total_recipes, 
      icon: CookingPot,
      color: "#10B981"
    },
    { 
      label: "Frais Généraux", 
      value: stats.total_overheads, 
      icon: Gear,
      color: "#F59E0B"
    },
    { 
      label: "Coût Moyen/Unité", 
      value: `${stats.avg_cost_per_unit.toFixed(2)} €`, 
      icon: TrendUp,
      color: "#8B5CF6"
    },
  ];

  const costDistributionData = [
    { name: "Matières", value: 45 },
    { name: "Main d'œuvre", value: 35 },
    { name: "Frais généraux", value: 20 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard-loading">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" data-testid="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title" data-testid="dashboard-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble du calcul des prix de revient</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-8" data-testid="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card" data-testid={`stat-card-${index}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="stat-label">{stat.label}</span>
              <stat.icon size={24} weight="duotone" style={{ color: stat.color }} />
            </div>
            <div className="stat-value" data-testid={`stat-value-${index}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Recent Recipes */}
      <div className="grid-2">
        {/* Cost Distribution Chart */}
        <div className="chart-container" data-testid="cost-distribution-chart">
          <h3 className="chart-title">Répartition Type des Coûts</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={costDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {costDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span style={{ color: '#71717A', fontSize: '14px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Recipes */}
        <div className="chart-container" data-testid="recent-recipes-section">
          <div className="flex items-center justify-between mb-4">
            <h3 className="chart-title">Recettes Récentes</h3>
            <button 
              onClick={() => navigate("/recipes")}
              className="btn-secondary text-sm"
              data-testid="view-all-recipes-btn"
            >
              Voir tout
              <ArrowRight size={16} />
            </button>
          </div>
          
          {stats.recent_recipes.length === 0 ? (
            <div className="empty-state" data-testid="no-recipes-message">
              <CookingPot size={48} className="mx-auto mb-4 text-zinc-300" />
              <p className="empty-state-title">Aucune recette</p>
              <p className="empty-state-text">Créez votre première recette pour voir les coûts</p>
              <button 
                onClick={() => navigate("/recipes")}
                className="btn-primary"
                data-testid="create-first-recipe-btn"
              >
                Créer une recette
              </button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="recent-recipes-list">
              {stats.recent_recipes.map((recipe, index) => (
                <div 
                  key={recipe.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors"
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                  data-testid={`recent-recipe-${index}`}
                >
                  <div>
                    <p className="font-medium text-zinc-900">{recipe.name}</p>
                    <p className="text-sm text-zinc-500">{recipe.output_unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-zinc-900">
                      {recipe.cost_per_unit.toFixed(2)} €
                    </p>
                    <p className="text-xs text-zinc-500">par unité</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid-3" data-testid="quick-actions">
        <div 
          className="stat-card cursor-pointer hover:border-[#002FA7] transition-colors"
          onClick={() => navigate("/materials")}
          data-testid="quick-action-materials"
        >
          <Package size={32} weight="duotone" className="text-[#002FA7] mb-3" />
          <h4 className="font-semibold text-zinc-900 mb-1">Gérer les Matières</h4>
          <p className="text-sm text-zinc-500">Ajouter ou modifier les matières premières</p>
        </div>
        <div 
          className="stat-card cursor-pointer hover:border-[#10B981] transition-colors"
          onClick={() => navigate("/recipes")}
          data-testid="quick-action-recipes"
        >
          <CookingPot size={32} weight="duotone" className="text-[#10B981] mb-3" />
          <h4 className="font-semibold text-zinc-900 mb-1">Créer une Recette</h4>
          <p className="text-sm text-zinc-500">Définir une nouvelle recette de production</p>
        </div>
        <div 
          className="stat-card cursor-pointer hover:border-[#F59E0B] transition-colors"
          onClick={() => navigate("/overheads")}
          data-testid="quick-action-overheads"
        >
          <Gear size={32} weight="duotone" className="text-[#F59E0B] mb-3" />
          <h4 className="font-semibold text-zinc-900 mb-1">Configurer les Frais</h4>
          <p className="text-sm text-zinc-500">Paramétrer les frais généraux</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
