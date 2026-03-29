import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash, Gear } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: "electricity", label: "Électricité" },
  { value: "rent", label: "Loyer" },
  { value: "depreciation", label: "Amortissement machines" },
  { value: "insurance", label: "Assurance" },
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Services publics" },
  { value: "other", label: "Autre" },
];

const ALLOCATION_METHODS = [
  { value: "per_unit", label: "Par unité produite" },
  { value: "per_hour", label: "Par heure de travail" },
  { value: "fixed", label: "Montant fixe par produit" },
];

const Overheads = () => {
  const [overheads, setOverheads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOverhead, setSelectedOverhead] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "electricity",
    monthly_amount: "",
    allocation_method: "per_unit",
    allocation_value: "100",
  });

  useEffect(() => {
    fetchOverheads();
  }, []);

  const fetchOverheads = async () => {
    try {
      const response = await axios.get(`${API}/overheads`);
      setOverheads(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des frais généraux");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        monthly_amount: parseFloat(formData.monthly_amount),
        allocation_value: parseFloat(formData.allocation_value),
      };

      if (selectedOverhead) {
        await axios.put(`${API}/overheads/${selectedOverhead.id}`, data);
        toast.success("Frais général mis à jour");
      } else {
        await axios.post(`${API}/overheads`, data);
        toast.success("Frais général créé");
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchOverheads();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (overhead) => {
    setSelectedOverhead(overhead);
    setFormData({
      name: overhead.name,
      category: overhead.category,
      monthly_amount: overhead.monthly_amount.toString(),
      allocation_method: overhead.allocation_method,
      allocation_value: (overhead.allocation_value || 100).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/overheads/${selectedOverhead.id}`);
      toast.success("Frais général supprimé");
      setIsDeleteDialogOpen(false);
      setSelectedOverhead(null);
      fetchOverheads();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedOverhead(null);
    setFormData({
      name: "",
      category: "electricity",
      monthly_amount: "",
      allocation_method: "per_unit",
      allocation_value: "100",
    });
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getCategoryLabel = (value) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getAllocationLabel = (value) => {
    return ALLOCATION_METHODS.find(m => m.value === value)?.label || value;
  };

  const getAllocationHelper = () => {
    switch (formData.allocation_method) {
      case "per_unit":
        return "Nombre d'unités produites par mois";
      case "per_hour":
        return "Nombre d'heures de travail par mois";
      case "fixed":
        return "Nombre de produits pour répartir le coût";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="overheads-loading">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" data-testid="overheads-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title" data-testid="overheads-title">Frais Généraux</h1>
          <p className="page-subtitle">Configurez les frais généraux à répartir sur vos produits</p>
        </div>
        <Button 
          onClick={openNewDialog}
          className="bg-[#002FA7] hover:bg-[#002482]"
          data-testid="add-overhead-btn"
        >
          <Plus size={20} className="mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Overheads Table */}
      {overheads.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-overheads-message">
          <Gear size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucun frais général</p>
          <p className="empty-state-text">Ajoutez vos frais fixes pour les inclure dans le calcul des coûts</p>
          <Button 
            onClick={openNewDialog}
            className="bg-[#002FA7] hover:bg-[#002482]"
            data-testid="add-first-overhead-btn"
          >
            <Plus size={20} className="mr-2" />
            Ajouter un frais
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="overheads-table-container">
          <table className="data-table" data-testid="overheads-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Catégorie</th>
                <th className="text-right">Montant Mensuel</th>
                <th>Méthode de Répartition</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overheads.map((overhead, index) => (
                <tr key={overhead.id} data-testid={`overhead-row-${index}`}>
                  <td className="font-medium">{overhead.name}</td>
                  <td>
                    <span className="badge badge-warning">{getCategoryLabel(overhead.category)}</span>
                  </td>
                  <td className="text-right font-mono">
                    {overhead.monthly_amount.toFixed(2)} €
                  </td>
                  <td className="text-zinc-500 text-sm">
                    {getAllocationLabel(overhead.allocation_method)}
                    <span className="text-zinc-400 ml-1">
                      ({overhead.allocation_value || 1} {overhead.allocation_method === "per_hour" ? "h" : "u"}/mois)
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(overhead)}
                        className="p-2 hover:bg-zinc-100 rounded-md transition-colors"
                        data-testid={`edit-overhead-${index}`}
                      >
                        <Pencil size={16} className="text-zinc-600" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOverhead(overhead);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors"
                        data-testid={`delete-overhead-${index}`}
                      >
                        <Trash size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" data-testid="overhead-dialog">
          <DialogHeader>
            <DialogTitle data-testid="overhead-dialog-title">
              {selectedOverhead ? "Modifier le frais" : "Nouveau frais général"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Électricité atelier"
                  required
                  data-testid="overhead-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="overhead-category-select">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_amount">Montant mensuel (€) *</Label>
                <Input
                  id="monthly_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                  placeholder="0.00"
                  required
                  data-testid="overhead-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allocation_method">Méthode de répartition *</Label>
                <Select 
                  value={formData.allocation_method} 
                  onValueChange={(value) => setFormData({ ...formData, allocation_method: value })}
                >
                  <SelectTrigger data-testid="overhead-allocation-select">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allocation_value">{getAllocationHelper()} *</Label>
                <Input
                  id="allocation_value"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.allocation_value}
                  onChange={(e) => setFormData({ ...formData, allocation_value: e.target.value })}
                  placeholder="100"
                  required
                  data-testid="overhead-allocation-value-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="overhead-cancel-btn">
                Annuler
              </Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="overhead-submit-btn">
                {selectedOverhead ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-overhead-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedOverhead?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-overhead-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="delete-overhead-confirm">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Overheads;
