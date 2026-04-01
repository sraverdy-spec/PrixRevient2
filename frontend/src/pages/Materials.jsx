import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Pencil, Trash, Package, UploadSimple, DownloadSimple, FileText, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UNITS = [
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "g", label: "Gramme (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "mL", label: "Millilitre (mL)" },
  { value: "piece", label: "Piece" },
  { value: "m", label: "Metre (m)" },
  { value: "m2", label: "Metre carre (m2)" },
  { value: "unite", label: "Unite" },
];

const Materials = () => {
  const { isManager } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "", code_article: "", unit: "kg", unit_price: "", supplier_name: "",
    category_id: "", description: "", freinte: "0",
  });

  useEffect(() => {
    Promise.all([fetchMaterials(), fetchSuppliers(), fetchCategories(), fetchUnits()]);
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get(`${API}/materials`);
      setMaterials(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des matieres premieres");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch {}
  };

  const fetchUnits = async () => {
    try { setUnits((await axios.get(`${API}/units`)).data); } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        code_article: formData.code_article || null,
        unit: formData.unit,
        unit_price: parseFloat(formData.unit_price),
        supplier_name: formData.supplier_name,
        category_id: formData.category_id || null,
        description: formData.description,
        freinte: parseFloat(formData.freinte) || 0,
      };

      if (selectedMaterial) {
        await axios.put(`${API}/materials/${selectedMaterial.id}`, data);
        toast.success("Matiere premiere mise a jour");
      } else {
        await axios.post(`${API}/materials`, data);
        toast.success("Matiere premiere creee");
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
      code_article: material.code_article || "",
      unit: material.unit,
      unit_price: material.unit_price.toString(),
      supplier_name: material.supplier_name || "",
      category_id: material.category_id || "",
      description: material.description || "",
      freinte: (material.freinte || 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/materials/${selectedMaterial.id}`);
      toast.success("Matiere premiere supprimee");
      setIsDeleteDialogOpen(false);
      setSelectedMaterial(null);
      fetchMaterials();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setSelectedMaterial(null);
    setFormData({ name: "", code_article: "", unit: "kg", unit_price: "", supplier_name: "", category_id: "", description: "", freinte: "0" });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(`${API}/materials/import-csv`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success(`${response.data.imported_count} matiere(s) importee(s)`);
        if (response.data.errors?.length > 0) {
          toast.warning(`${response.data.errors.length} erreur(s)`);
        }
        fetchMaterials();
      } else {
        toast.error("Aucune matiere importee");
      }
      setIsImportDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    window.open(`${API}/materials/csv-template`, '_blank');
  };

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.supplier_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || "";

  if (loading) {
    return <div className="flex items-center justify-center h-64" data-testid="materials-loading"><div className="text-zinc-500">Chargement...</div></div>;
  }

  return (
    <div className="fade-in" data-testid="materials-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title" data-testid="materials-title">Matieres Premieres</h1>
          <p className="page-subtitle">Gerez votre catalogue de matieres premieres</p>
        </div>
        <div className="flex gap-3">
          {isManager && (
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="import-materials-csv-btn">
              <UploadSimple size={18} className="mr-2" /> Importer CSV
            </Button>
          )}
          {isManager && (
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-material-btn">
              <Plus size={20} className="mr-2" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {materials.length > 0 && (
        <div className="mb-4 relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Rechercher une matiere..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 max-w-sm"
            data-testid="materials-search-input"
          />
        </div>
      )}

      {filteredMaterials.length === 0 && materials.length === 0 ? (
        <div className="empty-state bg-white border border-zinc-200 rounded-lg" data-testid="no-materials-message">
          <Package size={64} className="mx-auto mb-4 text-zinc-300" />
          <p className="empty-state-title">Aucune matiere premiere</p>
          <p className="empty-state-text">Commencez par ajouter ou importer vos matieres premieres</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <UploadSimple size={18} className="mr-2" /> Importer CSV
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="add-first-material-btn">
              <Plus size={20} className="mr-2" /> Ajouter
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="materials-table-container">
          <table className="data-table" data-testid="materials-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Unite</th>
                <th className="text-right">Prix Unitaire</th>
                <th className="text-right">Freinte %</th>
                <th>Fournisseur</th>
                <th>Categorie</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material, index) => (
                <tr key={material.id} data-testid={`material-row-${index}`}>
                  <td className="font-medium">{material.name}</td>
                  <td className="text-xs text-zinc-400 font-mono">{material.code_article || "-"}</td>
                  <td><span className="badge badge-info">{material.unit}</span></td>
                  <td className="text-right font-mono">{(material.unit_price || 0).toFixed(2)} EUR</td>
                  <td className="text-right">
                    {material.freinte > 0 ? (
                      <span className="text-red-500 font-medium">{material.freinte}%</span>
                    ) : (
                      <span className="text-zinc-400">0%</span>
                    )}
                  </td>
                  <td className="text-zinc-500">{material.supplier_name || "-"}</td>
                  <td className="text-zinc-500">{getCategoryName(material.category_id) || "-"}</td>
                  <td className="text-right">
                    {isManager && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(material)} className="p-2 hover:bg-zinc-100 rounded-md transition-colors" data-testid={`edit-material-${index}`}>
                          <Pencil size={16} className="text-zinc-600" />
                        </button>
                        <button onClick={() => { setSelectedMaterial(material); setIsDeleteDialogOpen(true); }} className="p-2 hover:bg-red-50 rounded-md transition-colors" data-testid={`delete-material-${index}`}>
                          <Trash size={16} className="text-red-500" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="material-dialog">
          <DialogHeader>
            <DialogTitle data-testid="material-dialog-title">
              {selectedMaterial ? "Modifier la matiere" : "Nouvelle matiere premiere"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Farine de ble" required data-testid="material-name-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code_article">Code article</Label>
                  <Input id="code_article" value={formData.code_article} onChange={(e) => setFormData({ ...formData, code_article: e.target.value })} placeholder="SKU / Ref" data-testid="material-code-input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unite *</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger data-testid="material-unit-select"><SelectValue placeholder="Unite" /></SelectTrigger>
                    <SelectContent>
                      {units.length > 0 ? units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>) : (
                        UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Prix unitaire (EUR) *</Label>
                  <Input id="unit_price" type="number" step="0.01" min="0" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} placeholder="0.00" required data-testid="material-price-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freinte">Freinte (%)</Label>
                  <Input id="freinte" type="number" step="0.1" min="0" max="100" value={formData.freinte} onChange={(e) => setFormData({ ...formData, freinte: e.target.value })} placeholder="0" data-testid="material-freinte-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Fournisseur</Label>
                  {suppliers.length > 0 ? (
                    <Select value={formData.supplier_name} onValueChange={(v) => setFormData({ ...formData, supplier_name: v })}>
                      <SelectTrigger data-testid="material-supplier-select"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {suppliers.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="supplier_name" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} placeholder="Nom du fournisseur" data-testid="material-supplier-input" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categorie</Label>
                  <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="material-category-select"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description optionnelle" data-testid="material-description-input" />
              </div>
              {formData.freinte > 0 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm text-red-700">
                    Freinte de {formData.freinte}% : le cout reel sera de{" "}
                    <span className="font-mono font-bold">
                      {(parseFloat(formData.unit_price || 0) * (1 + parseFloat(formData.freinte) / 100)).toFixed(2)} EUR
                    </span>{" "}
                    par {formData.unit} (perte incluse)
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="material-cancel-btn">Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="material-submit-btn">
                {selectedMaterial ? "Mettre a jour" : "Creer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-material-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Supprimer "{selectedMaterial?.name}" ? Cette action est irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-material-cancel">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="delete-material-confirm">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="import-materials-csv-dialog">
          <DialogHeader>
            <DialogTitle>Importer des matieres premieres (CSV)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Format attendu</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Colonnes : name, unit, unit_price, supplier, freinte, stock
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Separateur : point-virgule (;) ou virgule (,)</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={downloadTemplate} data-testid="download-materials-template-btn">
                <DownloadSimple size={18} className="mr-2" /> Telecharger le modele CSV
              </Button>
            </div>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-material-upload" data-testid="csv-material-file-input" />
              <UploadSimple size={40} className="mx-auto mb-3 text-zinc-400" />
              <p className="text-zinc-600 mb-3">{importing ? "Import en cours..." : "Selectionnez votre fichier CSV"}</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="select-materials-csv-btn">
                {importing ? "Import en cours..." : "Selectionner un fichier"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;
