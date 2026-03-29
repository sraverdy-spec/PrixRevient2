import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash, Tag } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ["#002FA7", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#002FA7" });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/categories`, formData);
      toast.success("Catégorie créée");
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", color: "#002FA7" });
      fetchCategories();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success("Catégorie supprimée");
      fetchCategories();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  return (
    <div className="fade-in" data-testid="categories-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Catégories</h1>
          <p className="page-subtitle">Organisez vos recettes par catégories</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]">
          <Plus size={20} className="mr-2" /> Ajouter
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg">
          <Tag size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune catégorie</p>
          <p className="empty-state-text">Créez des catégories pour organiser vos recettes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white border border-zinc-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="font-semibold text-zinc-900">{cat.name}</span>
                </div>
                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1 hover:bg-red-50 rounded">
                  <Trash size={14} className="text-red-500" />
                </button>
              </div>
              {cat.description && <p className="text-sm text-zinc-500">{cat.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div><Label>Nom *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
              <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              <div>
                <Label>Couleur</Label>
                <div className="flex gap-2 mt-2">
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setFormData({...formData, color})}
                      className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-zinc-900' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
