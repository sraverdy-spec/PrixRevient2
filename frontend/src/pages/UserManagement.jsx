import { useState, useEffect } from "react";
import axios from "axios";
import { Users, Plus, Pencil, Trash, Key, ShieldCheck, ShieldWarning, Eye } from "@phosphor-icons/react";
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

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const ROLES = [
  { value: "admin", label: "Administrateur", desc: "Acces total", color: "bg-red-100 text-red-700" },
  { value: "manager", label: "Manager", desc: "Creer/modifier recettes et matieres", color: "bg-blue-100 text-blue-700" },
  { value: "operator", label: "Operateur", desc: "Consultation uniquement", color: "bg-zinc-100 text-zinc-700" },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [createForm, setCreateForm] = useState({ email: "", password: "", name: "", role: "operator" });
  const [editForm, setEditForm] = useState({ name: "", role: "" });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API + "/users", { withCredentials: true });
      setUsers(res.data);
    } catch { toast.error("Erreur chargement utilisateurs"); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API + "/users", createForm, { withCredentials: true });
      toast.success("Utilisateur cree");
      setIsCreateOpen(false);
      setCreateForm({ email: "", password: "", name: "", role: "operator" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + "/users/" + selectedUser._id, editForm, { withCredentials: true });
      toast.success("Utilisateur mis a jour");
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.put(API + "/users/" + user._id, { is_active: !user.is_active }, { withCredentials: true });
      toast.success(user.is_active ? "Utilisateur desactive" : "Utilisateur active");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API + "/users/" + selectedUser._id + "/password", { new_password: newPassword }, { withCredentials: true });
      toast.success("Mot de passe modifie");
      setIsPasswordOpen(false);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(API + "/users/" + selectedUser._id, { withCredentials: true });
      toast.success("Utilisateur supprime");
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const getRoleBadge = (role) => {
    const r = ROLES.find(x => x.value === role) || ROLES[2];
    return <span className={"text-xs px-2 py-1 rounded font-medium " + r.color}>{r.label}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  return (
    <div className="fade-in" data-testid="user-management-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Gestion des Utilisateurs</h1>
          <p className="page-subtitle">Creez et gerez les comptes et les droits d'acces</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#002FA7] hover:bg-[#002482]" data-testid="create-user-btn">
          <Plus size={20} className="mr-2" /> Nouvel utilisateur
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {ROLES.map(r => (
          <div key={r.value} className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              {r.value === "admin" ? <ShieldCheck size={18} className="text-red-500" /> :
               r.value === "manager" ? <ShieldCheck size={18} className="text-blue-500" /> :
               <Eye size={18} className="text-zinc-500" />}
              <span className="font-semibold text-sm">{r.label}</span>
            </div>
            <p className="text-xs text-zinc-500">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="users-table-container">
        <table className="data-table" data-testid="users-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Role</th>
              <th>Statut</th>
              <th>Date de creation</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => {
              const isSelf = u._id === currentUser?._id;
              return (
                <tr key={u._id} data-testid={"user-row-" + idx} className={!u.is_active && u.is_active !== undefined ? "opacity-50" : ""}>
                  <td className="font-medium">
                    {u.name}
                    {isSelf && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Vous</span>}
                  </td>
                  <td className="text-zinc-500">{u.email}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>
                    {u.is_active === false ? (
                      <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded font-medium">Desactive</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded font-medium">Actif</span>
                    )}
                  </td>
                  <td className="text-zinc-500 text-sm">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : "-"}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedUser(u); setEditForm({ name: u.name, role: u.role }); setIsEditOpen(true); }}
                        className="p-2 hover:bg-zinc-100 rounded-md" title="Modifier"
                        data-testid={"edit-user-" + idx}
                      >
                        <Pencil size={16} className="text-zinc-600" />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(u); setNewPassword(""); setIsPasswordOpen(true); }}
                        className="p-2 hover:bg-zinc-100 rounded-md" title="Changer mot de passe"
                        data-testid={"password-user-" + idx}
                      >
                        <Key size={16} className="text-zinc-600" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="p-2 hover:bg-zinc-100 rounded-md"
                          title={u.is_active === false ? "Activer" : "Desactiver"}
                          data-testid={"toggle-user-" + idx}
                        >
                          {u.is_active === false ? (
                            <ShieldCheck size={16} className="text-green-600" />
                          ) : (
                            <ShieldWarning size={16} className="text-amber-500" />
                          )}
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => { setSelectedUser(u); setIsDeleteOpen(true); }}
                          className="p-2 hover:bg-red-50 rounded-md"
                          data-testid={"delete-user-" + idx}
                        >
                          <Trash size={16} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="create-user-dialog">
          <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nom complet" required data-testid="create-user-name" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@example.com" required data-testid="create-user-email" />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe *</Label>
                <Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min. 6 caracteres" required minLength={6} data-testid="create-user-password" />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm({ ...createForm, role: v })}>
                  <SelectTrigger data-testid="create-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label} - {r.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="create-user-submit">Creer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="edit-user-dialog">
          <DialogHeader><DialogTitle>Modifier l'utilisateur</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} data-testid="edit-user-name" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger data-testid="edit-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="edit-user-submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="password-user-dialog">
          <DialogHeader><DialogTitle>Changer le mot de passe</DialogTitle></DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-zinc-500">Utilisateur : {selectedUser?.name} ({selectedUser?.email})</p>
              <div className="space-y-2">
                <Label>Nouveau mot de passe *</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caracteres" required minLength={6} data-testid="new-password-input" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-[#002FA7] hover:bg-[#002482]" data-testid="change-password-submit">Changer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent data-testid="delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer "{selectedUser?.name}" ({selectedUser?.email}) ? Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600" data-testid="confirm-delete-user">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
