import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash, Truck } from "@phosphor-icons/react";
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

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "", code: "", contact: "", email: "", phone: "", address: ""
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedSupplier) {
        await axios.put(`${API}/suppliers/${selectedSupplier.id}`, formData);
        toast.success("Fournisseur mis à jour");
      } else {
        await axios.post(`${API}/suppliers`, formData);
        toast.success("Fournisseur créé");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/suppliers/${selectedSupplier.id}`);
      toast.success("Fournisseur supprimé");
      setIsDeleteDialogOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setFormData({ name: "", code: "", contact: "", email: "", phone: "", address: "" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  return (
    <div className="fade-in" data-testid="suppliers-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="page-subtitle">Gérez vos fournisseurs de matières premières</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-supplier-btn">
          <Plus size={20} className="mr-2" /> Ajouter
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-suppliers">
          <Truck size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucun fournisseur</p>
          <p className="empty-state-text">Ajoutez vos fournisseurs pour les associer aux matières premières</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier, index) => (
                <tr key={supplier.id} data-testid={`supplier-row-${index}`}>
                  <td className="font-mono text-sm text-zinc-500">{supplier.code || "-"}</td>
                  <td className="font-medium">{supplier.name}</td>
                  <td>{supplier.contact || "-"}</td>
                  <td>{supplier.email || "-"}</td>
                  <td>{supplier.phone || "-"}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelectedSupplier(supplier); setFormData(supplier); setIsDialogOpen(true); }} className="p-2 hover:bg-zinc-100 rounded-md">
                        <Pencil size={16} className="text-zinc-600" />
                      </button>
                      <button onClick={() => { setSelectedSupplier(supplier); setIsDeleteDialogOpen(true); }} className="p-2 hover:bg-red-50 rounded-md">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSupplier ? "Modifier" : "Nouveau"} fournisseur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nom *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="supplier-name-input" /></div>
                <div><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Ex: FRN-001" data-testid="supplier-code-input" /></div>
              </div>
              <div><Label>Contact</Label><Input value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
              <div><Label>Téléphone</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
              <div><Label>Adresse</Label><Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]">{selectedSupplier ? "Mettre à jour" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Supprimer "{selectedSupplier?.name}" ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Suppliers;
