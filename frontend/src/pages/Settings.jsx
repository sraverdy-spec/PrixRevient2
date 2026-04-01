import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Gear, Palette, Image, Users, CloudArrowUp, Timer, Plugs, UploadSimple, Trash, Play, Plus, FloppyDisk, Ruler, Pencil, Key, Copy, Eye, EyeSlash, Buildings } from "@phosphor-icons/react";
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
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiDoc, setApiDoc] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [sites, setSites] = useState([]);
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [siteForm, setSiteForm] = useState({ name: "", address: "" });

  useEffect(() => {
    Promise.all([fetchSettings(), fetchCrontabs(), fetchUnits(), fetchApiKeys(), fetchApiDoc(), fetchSites()]).finally(() => setLoading(false));
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

  const fetchApiKeys = async () => {
    try { setApiKeys((await axios.get(API + "/api-keys")).data); } catch {}
  };

  const fetchApiDoc = async () => {
    try { setApiDoc((await axios.get(API + "/public/kpi/doc")).data); } catch {}
  };

  const handleCreateApiKey = async () => {
    if (!apiKeyName.trim()) return toast.error("Nom requis");
    try {
      await axios.post(API + "/api-keys", { name: apiKeyName });
      toast.success("Cle API creee");
      setApiKeyName("");
      fetchApiKeys();
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteApiKey = async (id) => {
    try {
      await axios.delete(API + "/api-keys/" + id);
      toast.success("Cle supprimee");
      fetchApiKeys();
    } catch { toast.error("Erreur"); }
  };

  const handleToggleApiKey = async (id) => {
    try {
      await axios.put(API + "/api-keys/" + id + "/toggle");
      toast.success("Statut mis a jour");
      fetchApiKeys();
    } catch { toast.error("Erreur"); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copie dans le presse-papier");
  };

  const fetchSites = async () => {
    try { setSites((await axios.get(API + "/sites")).data); } catch {}
  };

  const handleSaveSite = async (e) => {
    e.preventDefault();
    try {
      if (editingSite) {
        await axios.put(API + "/sites/" + editingSite.id, siteForm);
        toast.success("Site mis a jour");
      } else {
        await axios.post(API + "/sites", siteForm);
        toast.success("Site cree");
      }
      setIsSiteDialogOpen(false);
      setEditingSite(null);
      setSiteForm({ name: "", address: "" });
      fetchSites();
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteSite = async (id) => {
    try {
      await axios.delete(API + "/sites/" + id);
      toast.success("Site supprime");
      fetchSites();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
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
          <TabsTrigger value="api" data-testid="tab-api"><Key size={16} className="mr-2" /> API</TabsTrigger>
          <TabsTrigger value="sites" data-testid="tab-sites"><Buildings size={16} className="mr-2" /> Sites</TabsTrigger>
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
              <div>
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2"><Timer size={20} /> Taches planifiees</h3>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block"></span>
                  Scheduler actif — les taches s'executent automatiquement
                </p>
              </div>
              <Button onClick={() => setIsCronDialogOpen(true)} style={{ backgroundColor: settings.primary_color }} data-testid="add-cron-btn">
                <Plus size={16} className="mr-2" /> Nouvelle tache
              </Button>
            </div>
            {crontabs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Timer size={40} className="mx-auto mb-3 text-zinc-300" />
                <p>Aucune tache planifiee</p>
                <p className="text-sm mt-1">Creez une tache pour automatiser les imports SFTP ou l'enregistrement des prix</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crontabs.map((cron, i) => (
                  <div key={cron.id} className={"flex items-center justify-between p-4 border rounded-lg " + (cron.enabled ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50 opacity-60")} data-testid={"cron-row-" + i}>
                    <div className="flex items-center gap-4">
                      <Checkbox checked={cron.enabled} onCheckedChange={() => handleToggleCron(cron)} data-testid={"cron-toggle-" + i} />
                      <div>
                        <p className="font-medium">{cron.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{cron.schedule} | {cron.type === "sftp_scan" ? "Scan SFTP" : cron.type === "price_history" ? "Historique prix" : cron.type}</p>
                        {cron.last_run && (
                          <p className="text-xs mt-0.5">
                            <span className="text-zinc-400">Dernier: {new Date(cron.last_run).toLocaleString("fr-FR")}</span>
                            {cron.last_status && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${cron.last_status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {cron.last_status === "success" ? "OK" : "Erreur"}
                              </span>
                            )}
                            {cron.last_result && <span className="text-zinc-400 ml-1">— {cron.last_result}</span>}
                          </p>
                        )}
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
                        <SelectItem value="price_history">Enregistrement historique prix</SelectItem>
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

        {/* ===== API KEYS TAB ===== */}
        <TabsContent value="api">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gestion des cles */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2 mb-4"><Key size={20} /> Cles API</h3>
              <p className="text-sm text-zinc-500 mb-4">Generez des cles pour connecter des outils externes (Power BI, Grafana, Excel...)</p>

              <div className="flex gap-2 mb-4">
                <Input value={apiKeyName} onChange={e => setApiKeyName(e.target.value)} placeholder="Nom de la cle (ex: Power BI)" className="flex-1" data-testid="api-key-name-input" />
                <Button onClick={handleCreateApiKey} style={{ backgroundColor: settings.primary_color }} data-testid="create-api-key-btn">
                  <Plus size={16} className="mr-1" /> Creer
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <p className="text-center text-zinc-400 py-6 text-sm">Aucune cle API</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map(k => (
                    <div key={k.id} className="p-3 border border-zinc-200 rounded-lg" data-testid={"api-key-" + k.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{k.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${k.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {k.is_active ? "Active" : "Inactive"}
                          </span>
                          <button onClick={() => handleToggleApiKey(k.id)} className="p-1 hover:bg-zinc-100 rounded" title={k.is_active ? "Desactiver" : "Activer"}>
                            {k.is_active ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => handleDeleteApiKey(k.id)} className="p-1 hover:bg-red-50 rounded"><Trash size={14} className="text-red-500" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-zinc-50 px-2 py-1 rounded flex-1 font-mono truncate">
                          {showKey[k.id] ? k.key : k.key.substring(0, 8) + "••••••••••••••"}
                        </code>
                        <button onClick={() => setShowKey(prev => ({ ...prev, [k.id]: !prev[k.id] }))} className="p-1 hover:bg-zinc-100 rounded">
                          {showKey[k.id] ? <EyeSlash size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => copyToClipboard(k.key)} className="p-1 hover:bg-zinc-100 rounded" data-testid={"copy-key-" + k.id}>
                          <Copy size={14} />
                        </button>
                      </div>
                      {k.last_used && <p className="text-[10px] text-zinc-400 mt-1">Derniere utilisation: {new Date(k.last_used).toLocaleString("fr-FR")}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documentation API */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Documentation API KPI</h3>
              {apiDoc ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Authentification</p>
                    <p className="text-xs text-blue-700 mt-1">Header: <code className="bg-blue-100 px-1 rounded">X-API-Key: VOTRE_CLE</code></p>
                    <p className="text-xs text-blue-700">Ou param: <code className="bg-blue-100 px-1 rounded">?api_key=VOTRE_CLE</code></p>
                  </div>
                  {apiDoc.endpoints?.map((ep, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-mono font-bold">{ep.method}</span>
                        <code className="text-xs font-mono font-medium text-zinc-800">{ep.url}</code>
                      </div>
                      <p className="text-xs text-zinc-500 mb-2">{ep.description}</p>
                      {ep.champs_reponse && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-600">Champs de reponse</summary>
                          <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-zinc-200">
                            {Object.entries(ep.champs_reponse).map(([field, desc]) => (
                              <div key={field}><code className="text-blue-600">{field}</code> : <span className="text-zinc-500">{desc}</span></div>
                            ))}
                          </div>
                        </details>
                      )}
                      {ep.parametres && (
                        <details className="text-xs mt-1">
                          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-600">Parametres</summary>
                          <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-zinc-200">
                            {Object.entries(ep.parametres).map(([field, desc]) => (
                              <div key={field}><code className="text-amber-600">{field}</code> : <span className="text-zinc-500">{desc}</span></div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                  <div className="p-3 bg-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-400 mb-1">Exemple curl :</p>
                    <code className="text-xs text-green-400 break-all">{apiDoc.exemple_curl}</code>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Documentation non disponible</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== SITES TAB ===== */}
        <TabsContent value="sites">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2"><Buildings size={20} /> Sites de production</h3>
                <p className="text-sm text-zinc-500 mt-1">Gerez vos differents sites / usines de production</p>
              </div>
              <Button onClick={() => { setEditingSite(null); setSiteForm({ name: "", address: "" }); setIsSiteDialogOpen(true); }} style={{ backgroundColor: settings.primary_color }} data-testid="add-site-btn">
                <Plus size={16} className="mr-2" /> Nouveau site
              </Button>
            </div>
            <div className="space-y-2">
              {sites.map(site => (
                <div key={site.id} className="flex items-center justify-between p-4 border border-zinc-200 rounded-lg" data-testid={"site-" + site.id}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{site.name}</span>
                      {site.is_default && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">Par defaut</span>}
                    </div>
                    {site.address && <p className="text-xs text-zinc-400 mt-0.5">{site.address}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingSite(site); setSiteForm({ name: site.name, address: site.address || "" }); setIsSiteDialogOpen(true); }} className="p-1.5 hover:bg-zinc-100 rounded">
                      <Pencil size={14} className="text-zinc-500" />
                    </button>
                    {!site.is_default && (
                      <button onClick={() => handleDeleteSite(site.id)} className="p-1.5 hover:bg-red-50 rounded">
                        <Trash size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Dialog open={isSiteDialogOpen} onOpenChange={setIsSiteDialogOpen}>
            <DialogContent className="sm:max-w-[400px]" data-testid="site-dialog">
              <DialogHeader><DialogTitle>{editingSite ? "Modifier le site" : "Nouveau site"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveSite}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du site</Label>
                    <Input value={siteForm.name} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="Ex: Usine Nord" required data-testid="site-name-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input value={siteForm.address} onChange={e => setSiteForm({ ...siteForm, address: e.target.value })} placeholder="Ex: 12 rue de l'Usine, 59000 Lille" data-testid="site-address-input" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSiteDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" style={{ backgroundColor: settings.primary_color }} data-testid="site-submit-btn">{editingSite ? "Mettre a jour" : "Creer"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== SSO TAB ===== */}
        <TabsContent value="sso">
          <div className="space-y-6">
            {/* Google SSO */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google SSO
                </h3>
                <Checkbox checked={settings.sso_google_enabled || false} onCheckedChange={v => setSettings({ ...settings, sso_google_enabled: !!v })} data-testid="sso-google-toggle" />
              </div>
              {settings.sso_google_enabled && (
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="space-y-1.5">
                    <Label>Client ID</Label>
                    <Input value={settings.sso_google_client_id || ""} onChange={e => setSettings({ ...settings, sso_google_client_id: e.target.value })} placeholder="xxxxx.apps.googleusercontent.com" data-testid="google-client-id" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Secret</Label>
                    <Input type="password" value={settings.sso_google_client_secret || ""} onChange={e => setSettings({ ...settings, sso_google_client_secret: e.target.value })} placeholder="GOCSPX-xxxxx" data-testid="google-client-secret" />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <p className="font-medium mb-1">Configuration requise sur Google Cloud Console :</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Allez sur <b>console.cloud.google.com</b> &gt; APIs &amp; Services &gt; Credentials</li>
                      <li>Creez un <b>OAuth 2.0 Client ID</b> (type: Web application)</li>
                      <li>Ajoutez comme URI de redirection : <code className="bg-blue-100 px-1 rounded">https://calculprix.appli-sciad.com/api/auth/sso/google/callback</code></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Microsoft SSO */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/></svg>
                  Microsoft SSO
                </h3>
                <Checkbox checked={settings.sso_microsoft_enabled || false} onCheckedChange={v => setSettings({ ...settings, sso_microsoft_enabled: !!v })} data-testid="sso-microsoft-toggle" />
              </div>
              {settings.sso_microsoft_enabled && (
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="space-y-1.5">
                    <Label>Client ID (Application ID)</Label>
                    <Input value={settings.sso_microsoft_client_id || ""} onChange={e => setSettings({ ...settings, sso_microsoft_client_id: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" data-testid="microsoft-client-id" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Secret</Label>
                    <Input type="password" value={settings.sso_microsoft_client_secret || ""} onChange={e => setSettings({ ...settings, sso_microsoft_client_secret: e.target.value })} placeholder="xxxxxx~xxxxx" data-testid="microsoft-client-secret" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tenant ID (laisser vide pour multi-tenant)</Label>
                    <Input value={settings.sso_microsoft_tenant_id || ""} onChange={e => setSettings({ ...settings, sso_microsoft_tenant_id: e.target.value })} placeholder="common" data-testid="microsoft-tenant-id" />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <p className="font-medium mb-1">Configuration requise sur Azure Portal :</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Allez sur <b>portal.azure.com</b> &gt; Azure AD &gt; App registrations</li>
                      <li>Creez une application (Web)</li>
                      <li>Ajoutez comme URI de redirection : <code className="bg-blue-100 px-1 rounded">https://calculprix.appli-sciad.com/api/auth/sso/microsoft/callback</code></li>
                      <li>Creez un Client Secret dans Certificates &amp; Secrets</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
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
