import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash, Package } from "@phosphor-icons/react";
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

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "g", label: "Gramme (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "mL", label: "Millilitre (mL)" },
  { value: "pièce", label: "Pièce" },
  { value: "m", label: "Mètre (m)" },
  { value: "m²", label: "Mètre carré (m²)" },
  { value: "unité", label: "Unité" },
];

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "kg",
    unit_price: "",
    supplier: "",
    description: "",
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials`);
      setMaterials(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des matières premières");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        unit_price: parseFloat(formData.unit_price),
      };

      if (selectedMaterial) {
        await axios.put(`${API}/materials/${selectedMaterial.id}`, data);
        toast.success("Matière première mise à jour");
      } else {
        await axios.post(`${API}/materials`, data);
        toast.success("Matière première créée");
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (material) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      unit_price: material.unit_price.toString(),
      supplier: material.supplier || "",
      description: material.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/materials/${selectedMaterial.id}`);
      toast.success("Matière première supprimée");
      setIsDeleteDialogOpen(false);
      setSelectedMaterial(null);
      fetchMaterials();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedMaterial(null);
    setFormData({
      name: "",
      unit: "kg",
      unit_price: "",
      supplier: "",
      description: "",
    });
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="materials-loading">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" data-testid="materials-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title" data-testid="materials-title">Matières Premières</h1>
          <p className="page-subtitle">Gérez votre catalogue de matières premières</p>
        </div>
        <Button 
          onClick={openNewDialog}
          className="bg-[#002FA7] hover:bg-[#002482]"
          data-testid="add-material-btn"
        >
          <Plus size={20} className="mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Materials Table */}
      {materials.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-materials-message">
          <Package size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune matière première</p>
          <p className="empty-state-text">Commencez par ajouter vos matières premières</p>
          <Button 
            onClick={openNewDialog}
            className="bg-[#002FA7] hover:bg-[#002482]"
            data-testid="add-first-material-btn"
          >
            <Plus size={20} className="mr-2" />
            Ajouter une matière
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="materials-table-container">
          <table className="data-table" data-testid="materials-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Unité</th>
                <th className="text-right">Prix Unitaire</th>
                <th>Fournisseur</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id} data-testid={`material-row-${index}`}>
                  <td className="font-medium">{material.name}</td>
                  <td>
                    <span className="badge badge-info">{material.unit}</span>
                  </td>
                  <td className="text-right font-mono">
                    {material.unit_price.toFixed(2)} €
                  </td>
                  <td className="text-zinc-500">{material.supplier || "-"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(material)}
                        className="p-2 hover:bg-zinc-100 rounded-md transition-colors"
                        data-testid={`edit-material-${index}`}
                      >
                        <Pencil size={16} className="text-zinc-600" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMaterial(material);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors"
                        data-testid={`delete-material-${index}`}
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
        <DialogContent className="sm:max-w-[425px]" data-testid="material-dialog">
          <DialogHeader>
            <DialogTitle data-testid="material-dialog-title">
              {selectedMaterial ? "Modifier la matière" : "Nouvelle matière première"}
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
                  placeholder="Ex: Farine de blé"
                  required
                  data-testid="material-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger data-testid="material-unit-select">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Prix unitaire (€) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                    required
                    data-testid="material-price-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Fournisseur</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Ex: Moulin du Lac"
                  data-testid="material-supplier-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle"
                  data-testid="material-description-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="material-cancel-btn">
                Annuler
              </Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="material-submit-btn">
                {selectedMaterial ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-material-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedMaterial?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-material-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="delete-material-confirm">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Materials;
