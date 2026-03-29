import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TreeStructure, CookingPot, Eye } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function BOMTree() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState({});

  useEffect(() => {
    axios.get(API + "/recipes")
      .then(res => setRecipes(res.data))
      .catch(() => toast.error("Erreur"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const topLevel = recipes.filter(r => !r.is_intermediate);
  const intermediate = recipes.filter(r => r.is_intermediate);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;
  }

  const renderNode = (recipe, depth) => {
    const subs = (recipe.ingredients || []).filter(i => i.is_sub_recipe);
    const raws = (recipe.ingredients || []).filter(i => !i.is_sub_recipe);
    const isOpen = expandedIds[recipe.id + "-" + depth];
    const ml = depth * 28;

    let bgClass = "bg-white border-zinc-200";
    if (depth === 0) bgClass = "bg-[#002FA7] text-white border-[#002FA7]";
    else if (recipe.is_intermediate) bgClass = "bg-amber-50 border-amber-200";

    return (
      <div key={recipe.id + "-" + depth}>
        <div
          className={"flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm mb-1 " + bgClass}
          style={{ marginLeft: ml }}
          onClick={() => subs.length > 0 && toggle(recipe.id + "-" + depth)}
          data-testid={"bom-node-" + recipe.id}
        >
          {subs.length > 0 && (
            <span className="text-xs select-none">{isOpen ? "\u25BC" : "\u25B6"}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{recipe.name}</span>
              {recipe.is_intermediate && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Semi-fini</span>
              )}
            </div>
            <p className="text-xs opacity-70 mt-0.5">
              {raws.length + " mat. | " + (recipe.labor_costs || []).length + " MO" + (subs.length > 0 ? " | " + subs.length + " sous-rec." : "")}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate("/recipes/" + recipe.id); }}
          >
            <Eye size={12} className="mr-1" /> Detail
          </Button>
        </div>
        {isOpen && subs.length > 0 && depth < 5 && subs.map(ing => {
          const sub = recipes.find(r => r.id === ing.sub_recipe_id);
          if (!sub) return (
            <div key={ing.material_name} className="p-2 text-sm text-zinc-400 italic" style={{ marginLeft: (depth + 1) * 28 }}>
              {ing.material_name} (introuvable)
            </div>
          );
          return renderNode(sub, depth + 1);
        })}
      </div>
    );
  };

  return (
    <div className="fade-in" data-testid="bom-tree-page">
      <div className="mb-8">
        <h1 className="page-title">Arbre de Fabrication</h1>
        <p className="page-subtitle">Visualisez la structure de vos recettes et articles semi-finis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card" data-testid="bom-total-recipes">
          <div className="flex items-center gap-2 mb-2">
            <CookingPot size={20} className="text-[#002FA7]" />
            <span className="stat-label">Produits finis</span>
          </div>
          <div className="stat-value">{topLevel.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-intermediate">
          <div className="flex items-center gap-2 mb-2">
            <TreeStructure size={20} className="text-amber-500" />
            <span className="stat-label">Articles semi-finis</span>
          </div>
          <div className="stat-value">{intermediate.length}</div>
        </div>
        <div className="stat-card" data-testid="bom-total-all">
          <div className="flex items-center gap-2 mb-2">
            <CookingPot size={20} className="text-[#10B981]" />
            <span className="stat-label">Total recettes</span>
          </div>
          <div className="stat-value">{recipes.length}</div>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <TreeStructure size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune recette</p>
          <p className="empty-state-text">Creez des recettes pour voir l arbre de fabrication</p>
          <Button onClick={() => navigate("/recipes")} className="bg-[#002FA7] hover:bg-[#002482]">Creer une recette</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Produits finis</h3>
            {topLevel.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucun produit fini.</p>
            ) : (
              <div className="space-y-1">{topLevel.map(r => renderNode(r, 0))}</div>
            )}
          </div>

          {intermediate.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Articles semi-finis disponibles</h3>
              <div className="space-y-1">{intermediate.map(r => renderNode(r, 0))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
