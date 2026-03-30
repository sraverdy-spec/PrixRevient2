import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Gear, Palette, Image, Users, CloudArrowUp, Timer, Plugs, UploadSimple, Trash, Play, Plus, FloppyDisk, Ruler, Pencil } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import UserManagement from "@/pages/UserManagement";
import ImportCenter from "@/pages/ImportCenter";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const COLOR_PRESETS = [
  { name: "Bleu (defaut)", primary: "#002FA7", secondary: "#10B981", accent: "#F59E0B", sidebar_bg: "#F4F4F5", sidebar_active_bg: "#002FA7" },
  { name: "Vert foret", primary: "#166534", secondary: "#0284C7", accent: "#D97706", sidebar_bg: "#F0FDF4", sidebar_active_bg: "#166534" },
  { name: "Violet profond", primary: "#6D28D9", secondary: "#EC4899", accent: "#F59E0B", sidebar_bg: "#FAF5FF", sidebar_active_bg: "#6D28D9" },
  { name: "Rouge entreprise", primary: "#B91C1C", secondary: "#0891B2", accent: "#CA8A04", sidebar_bg: "#FEF2F2", sidebar_active_bg: "#B91C1C" },
  { name: "Bleu marine", primary: "#1E3A5F", secondary: "#10B981", accent: "#F97316", sidebar_bg: "#F0F4F8", sidebar_active_bg: "#1E3A5F" },
  { name: "Noir elegant", primary: "#18181B", secondary: "#10B981", accent: "#EAB308", sidebar_bg: "#FAFAFA", sidebar_active_bg: "#18181B" },
];

function ColorInput({ label, value, onChange, testId }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-zinc-300 cursor-pointer" data-testid={testId} />
        <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-sm h-8" />
      </div>
    </div>
  );
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const logoInputRef = useRef(null);
  const [settings, setSettings] = useState(null);
  const [crontabs, setCrontabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCronDialogOpen, setIsCronDialogOpen] = useState(false);
  const [cronForm, setCronForm] = useState({ name: "", type: "sftp_scan", schedule: "*/30 * * * *", enabled: true });
  const [units, setUnits] = useState([]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "", type: "quantite" });

  useEffect(() => {
    Promise.all([fetchSettings(), fetchCrontabs(), fetchUnits()]).finally(() => setLoading(false));
  }, []);

  const fetchSettings = async () => {
    try { setSettings((await axios.get(API + "/settings")).data); } catch {}
  };
  const fetchCrontabs = async () => {
    try { setCrontabs((await axios.get(API + "/crontabs")).data); } catch {}
  };

  const fetchUnits = async () => {
    try { setUnits((await axios.get(API + "/units")).data); } catch {}
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await axios.put(API + "/units/" + editingUnit.id, unitForm);
        toast.success("Unite mise a jour");
      } else {
        await axios.post(API + "/units", unitForm);
        toast.success("Unite creee");
      }
      setIsUnitDialogOpen(false);
      setEditingUnit(null);
      setUnitForm({ name: "", abbreviation: "", type: "quantite" });
      fetchUnits();
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteUnit = async (id) => {
    try {
      await axios.delete(API + "/units/" + id);
      toast.success("Unite supprimee");
      fetchUnits();
    } catch { toast.error("Erreur"); }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await axios.put(API + "/settings", settings);
      setSettings(res.data);
      toast.success("Parametres sauvegardes");
      window.dispatchEvent(new Event("settings-updated"));
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(API + "/settings/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSettings(prev => ({ ...prev, logo_data: res.data.logo_data }));
      toast.success("Logo mis a jour");
      window.dispatchEvent(new Event("settings-updated"));
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleDeleteLogo = async () => {
    try {
      await axios.delete(API + "/settings/logo");
      setSettings(prev => ({ ...prev, logo_data: "" }));
      toast.success("Logo supprime");
      window.dispatchEvent(new Event("settings-updated"));
    } catch { toast.error("Erreur"); }
  };

  const applyPreset = (preset) => {
    setSettings(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
      sidebar_bg: preset.sidebar_bg,
      sidebar_active_bg: preset.sidebar_active_bg,
      sidebar_active_text: "#FFFFFF",
    }));
  };

  const handleCreateCron = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(API + "/crontabs", cronForm);
      setCrontabs(prev => [...prev, res.data]);
      toast.success("Tache planifiee creee");
      setIsCronDialogOpen(false);
      setCronForm({ name: "", type: "sftp_scan", schedule: "*/30 * * * *", enabled: true });
    } catch { toast.error("Erreur"); }
  };

  const handleToggleCron = async (cron) => {
    try {
      const res = await axios.put(API + "/crontabs/" + cron.id, { enabled: !cron.enabled });
      setCrontabs(prev => prev.map(c => c.id === cron.id ? res.data : c));
    } catch { toast.error("Erreur"); }
  };

  const handleRunCron = async (cron) => {
    try {
      await axios.post(API + "/crontabs/" + cron.id + "/run");
      toast.success("Tache executee");
      fetchCrontabs();
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteCron = async (id) => {
    try {
      await axios.delete(API + "/crontabs/" + id);
      setCrontabs(prev => prev.filter(c => c.id !== id));
      toast.success("Supprime");
    } catch { toast.error("Erreur"); }
  };

  if (loading || !settings) return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;

  return (
    <div className="fade-in" data-testid="settings-page">
      <div className="mb-8">
        <h1 className="page-title">Parametres</h1>
        <p className="page-subtitle">Configuration de l application</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="appearance" data-testid="tab-appearance"><Palette size={16} className="mr-2" /> Apparence</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users"><Users size={16} className="mr-2" /> Utilisateurs</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import"><CloudArrowUp size={16} className="mr-2" /> Import</TabsTrigger>
          <TabsTrigger value="crontabs" data-testid="tab-crontabs"><Timer size={16} className="mr-2" /> Taches planifiees</TabsTrigger>
          <TabsTrigger value="units" data-testid="tab-units"><Ruler size={16} className="mr-2" /> Unites</TabsTrigger>
          <TabsTrigger value="sso" data-testid="tab-sso"><Plugs size={16} className="mr-2" /> SSO</TabsTrigger>
        </TabsList>

        {/* ===== APPEARANCE TAB ===== */}
        <TabsContent value="appearance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo & Company */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Image size={20} /> Logo et nom
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la societe</Label>
                  <Input value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} data-testid="company-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  {settings.logo_data ? (
                    <div className="flex items-center gap-4">
                      <img src={settings.logo_data} alt="Logo" className="h-16 w-auto object-contain rounded border border-zinc-200 p-1" data-testid="logo-preview" />
                      <Button variant="outline" size="sm" onClick={handleDeleteLogo} data-testid="delete-logo-btn">
                        <Trash size={14} className="mr-1" /> Supprimer
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center">
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" data-testid="logo-file-input" />
                      <UploadSimple size={28} className="mx-auto mb-2 text-zinc-400" />
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} data-testid="upload-logo-btn">
                        Choisir une image
                      </Button>
                      <p className="text-xs text-zinc-400 mt-2">PNG, JPG, SVG - max 2 Mo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Color Presets */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Palette size={20} /> Themes predifinis
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PRESETS.map((preset, i) => (
                  <button key={i} onClick={() => applyPreset(preset)}
                    className="p-3 border border-zinc-200 rounded-lg hover:border-zinc-400 transition-all text-left"
                    data-testid={"preset-" + i}
                  >
                    <div className="flex gap-1 mb-2">
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.primary }} />
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <p className="text-xs font-medium text-zinc-700">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Couleurs personnalisees</h3>
              <div className="grid grid-cols-2 gap-3">
                <ColorInput label="Principale" value={settings.primary_color} onChange={v => setSettings({ ...settings, primary_color: v })} testId="color-primary" />
                <ColorInput label="Secondaire" value={settings.secondary_color} onChange={v => setSettings({ ...settings, secondary_color: v })} testId="color-secondary" />
                <ColorInput label="Accent" value={settings.accent_color} onChange={v => setSettings({ ...settings, accent_color: v })} testId="color-accent" />
                <ColorInput label="Danger" value={settings.danger_color} onChange={v => setSettings({ ...settings, danger_color: v })} testId="color-danger" />
                <ColorInput label="Fond sidebar" value={settings.sidebar_bg} onChange={v => setSettings({ ...settings, sidebar_bg: v })} testId="color-sidebar-bg" />
                <ColorInput label="Sidebar actif" value={settings.sidebar_active_bg} onChange={v => setSettings({ ...settings, sidebar_active_bg: v })} testId="color-sidebar-active" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Apercu</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: settings.sidebar_bg }}>
                {settings.logo_data && <img src={settings.logo_data} alt="" className="h-8 w-auto" />}
                <span className="font-bold" style={{ color: settings.primary_color }}>{settings.company_name}</span>
              </div>
              <button className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: settings.primary_color }}>Bouton principal</button>
              <button className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: settings.secondary_color }}>Secondaire</button>
              <button className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: settings.accent_color }}>Accent</button>
              <div className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: settings.sidebar_active_bg }}>Menu actif</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving} className="px-8" style={{ backgroundColor: settings.primary_color }} data-testid="save-settings-btn">
              <FloppyDisk size={18} className="mr-2" /> {saving ? "Sauvegarde..." : "Sauvegarder les parametres"}
            </Button>
          </div>
        </TabsContent>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users"><UserManagement /></TabsContent>

        {/* ===== IMPORT TAB ===== */}
        <TabsContent value="import"><ImportCenter /></TabsContent>

        {/* ===== CRONTABS TAB ===== */}
        <TabsContent value="crontabs">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2"><Timer size={20} /> Taches planifiees</h3>
              <Button onClick={() => setIsCronDialogOpen(true)} style={{ backgroundColor: settings.primary_color }} data-testid="add-cron-btn">
                <Plus size={16} className="mr-2" /> Nouvelle tache
              </Button>
            </div>
            {crontabs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Timer size={40} className="mx-auto mb-3 text-zinc-300" />
                <p>Aucune tache planifiee</p>
                <p className="text-sm mt-1">Creez une tache pour automatiser les imports SFTP</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crontabs.map((cron, i) => (
                  <div key={cron.id} className={"flex items-center justify-between p-4 border rounded-lg " + (cron.enabled ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50 opacity-60")} data-testid={"cron-row-" + i}>
                    <div className="flex items-center gap-4">
                      <Checkbox checked={cron.enabled} onCheckedChange={() => handleToggleCron(cron)} />
                      <div>
                        <p className="font-medium">{cron.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{cron.schedule} | {cron.type}</p>
                        {cron.last_run && <p className="text-xs text-zinc-400 mt-0.5">Dernier: {new Date(cron.last_run).toLocaleString("fr-FR")}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRunCron(cron)} data-testid={"run-cron-" + i}><Play size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteCron(cron.id)} className="text-red-500 hover:bg-red-50"><Trash size={14} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Dialog open={isCronDialogOpen} onOpenChange={setIsCronDialogOpen}>
            <DialogContent className="sm:max-w-[400px]" data-testid="cron-dialog">
              <DialogHeader><DialogTitle>Nouvelle tache planifiee</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateCron}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={cronForm.name} onChange={e => setCronForm({ ...cronForm, name: e.target.value })} placeholder="Ex: Import SFTP quotidien" required data-testid="cron-name-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={cronForm.type} onValueChange={v => setCronForm({ ...cronForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sftp_scan">Scan SFTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequence (cron)</Label>
                    <Select value={cronForm.schedule} onValueChange={v => setCronForm({ ...cronForm, schedule: v })}>
                      <SelectTrigger data-testid="cron-schedule-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*/5 * * * *">Toutes les 5 min</SelectItem>
                        <SelectItem value="*/15 * * * *">Toutes les 15 min</SelectItem>
                        <SelectItem value="*/30 * * * *">Toutes les 30 min</SelectItem>
                        <SelectItem value="0 * * * *">Toutes les heures</SelectItem>
                        <SelectItem value="0 */6 * * *">Toutes les 6 heures</SelectItem>
                        <SelectItem value="0 8 * * *">Chaque jour a 8h</SelectItem>
                        <SelectItem value="0 8 * * 1-5">Lun-Ven a 8h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCronDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" style={{ backgroundColor: settings.primary_color }} data-testid="cron-submit-btn">Creer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== UNITS TAB ===== */}
        <TabsContent value="units">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2"><Ruler size={20} /> Unites de mesure</h3>
              <Button onClick={() => { setEditingUnit(null); setUnitForm({ name: "", abbreviation: "", type: "quantite" }); setIsUnitDialogOpen(true); }} style={{ backgroundColor: settings.primary_color }} data-testid="add-unit-btn">
                <Plus size={16} className="mr-2" /> Nouvelle unite
              </Button>
            </div>
            {["poids", "volume", "quantite", "longueur"].map(type => {
              const typeUnits = units.filter(u => u.type === type);
              if (typeUnits.length === 0) return null;
              const typeLabels = { poids: "Poids", volume: "Volume", quantite: "Quantite", longueur: "Longueur" };
              return (
                <div key={type} className="mb-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{typeLabels[type] || type}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {typeUnits.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg" data-testid={"unit-" + u.id}>
                        <div>
                          <span className="font-medium text-sm">{u.name}</span>
                          <span className="text-xs text-zinc-400 ml-2">({u.abbreviation})</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingUnit(u); setUnitForm({ name: u.name, abbreviation: u.abbreviation, type: u.type }); setIsUnitDialogOpen(true); }} className="p-1 hover:bg-zinc-100 rounded" data-testid={"edit-unit-" + u.id}>
                            <Pencil size={14} className="text-zinc-500" />
                          </button>
                          <button onClick={() => handleDeleteUnit(u.id)} className="p-1 hover:bg-red-50 rounded" data-testid={"delete-unit-" + u.id}>
                            <Trash size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
            <DialogContent className="sm:max-w-[400px]" data-testid="unit-dialog">
              <DialogHeader><DialogTitle>{editingUnit ? "Modifier l'unite" : "Nouvelle unite"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveUnit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={unitForm.name} onChange={e => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="Ex: Kilogramme" required data-testid="unit-name-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Abreviation</Label>
                    <Input value={unitForm.abbreviation} onChange={e => setUnitForm({ ...unitForm, abbreviation: e.target.value })} placeholder="Ex: kg" required data-testid="unit-abbr-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={unitForm.type} onValueChange={v => setUnitForm({ ...unitForm, type: v })}>
                      <SelectTrigger data-testid="unit-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poids">Poids</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="quantite">Quantite</SelectItem>
                        <SelectItem value="longueur">Longueur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" style={{ backgroundColor: settings.primary_color }} data-testid="unit-submit-btn">{editingUnit ? "Mettre a jour" : "Creer"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== SSO TAB ===== */}
        <TabsContent value="sso">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2"><Plugs size={20} /> Single Sign-On (SSO)</h3>
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <Checkbox checked={settings.sso_enabled} onCheckedChange={v => setSettings({ ...settings, sso_enabled: !!v })} data-testid="sso-toggle" />
              <div>
                <p className="font-medium text-amber-900">{settings.sso_enabled ? "SSO active" : "SSO desactive"}</p>
                <p className="text-sm text-amber-700">L activation du SSO necessite une configuration prealable</p>
              </div>
            </div>
            {settings.sso_enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Fournisseur SSO</Label>
                  <Select value={settings.sso_provider || "none"} onValueChange={v => setSettings({ ...settings, sso_provider: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="sso-provider-select"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="google">Google Workspace</SelectItem>
                      <SelectItem value="azure">Microsoft Azure AD</SelectItem>
                      <SelectItem value="okta">Okta</SelectItem>
                      <SelectItem value="keycloak">Keycloak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input value={settings.sso_client_id} onChange={e => setSettings({ ...settings, sso_client_id: e.target.value })} placeholder="Votre Client ID SSO" data-testid="sso-client-id" />
                </div>
                <div className="space-y-2">
                  <Label>Domaine</Label>
                  <Input value={settings.sso_domain} onChange={e => setSettings({ ...settings, sso_domain: e.target.value })} placeholder="auth.votredomaine.fr" data-testid="sso-domain" />
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving} style={{ backgroundColor: settings.primary_color }} data-testid="save-sso-btn">
                <FloppyDisk size={18} className="mr-2" /> Sauvegarder
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
