import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { CloudArrowUp, FolderOpen, Clock, CheckCircle, XCircle, ArrowClockwise, UploadSimple, FileText, Plugs } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function ImportCenter() {
  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importType, setImportType] = useState("materials");

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(API + "/import/status");
      setImportStatus(res.data);
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  const handleSftpScan = async () => {
    setScanning(true);
    try {
      const res = await axios.post(API + "/import/sftp-scan");
      if (res.data.files_scanned === 0) {
        toast.info("Aucun fichier CSV a traiter");
      } else {
        toast.success(res.data.files_scanned + " fichier(s) traite(s)");
      }
      fetchStatus();
    } catch { toast.error("Erreur SFTP scan"); }
    finally { setScanning(false); }
  };

  const handleAutoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(API + "/import/auto?import_type=" + importType, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success(res.data.imported_count + " element(s) importe(s)");
      }
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur import");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-zinc-500">Chargement...</div></div>;
  }

  return (
    <div className="fade-in" data-testid="import-center-page">
      <div className="mb-8">
        <h1 className="page-title">Centre d'Import</h1>
        <p className="page-subtitle">Import automatique via API REST ou surveillance SFTP</p>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api" data-testid="tab-api">
            <Plugs size={16} className="mr-2" /> API REST
          </TabsTrigger>
          <TabsTrigger value="sftp" data-testid="tab-sftp">
            <FolderOpen size={16} className="mr-2" /> SFTP / Dossier
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock size={16} className="mr-2" /> Historique
          </TabsTrigger>
        </TabsList>

        {/* API Import Tab */}
        <TabsContent value="api">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <CloudArrowUp size={20} className="text-[#002FA7]" /> Import via API
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type d'import</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger data-testid="import-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materials">Matieres premieres</SelectItem>
                      <SelectItem value="recipes">Recettes simples</SelectItem>
                      <SelectItem value="bom">Arbre de fabrication (BOM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center">
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleAutoUpload} className="hidden" data-testid="auto-import-file-input" />
                  <UploadSimple size={32} className="mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-600 mb-3">{uploading ? "Import en cours..." : "Fichier CSV"}</p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="auto-import-btn">
                    {uploading ? "Import en cours..." : "Selectionner et importer"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Documentation API</h3>
              <div className="space-y-3">
                {importStatus?.api_endpoints && Object.entries(importStatus.api_endpoints).map(([key, val]) => (
                  <div key={key} className="p-3 bg-zinc-50 rounded-lg">
                    <p className="font-mono text-sm text-zinc-900 font-medium">{val}</p>
                    <p className="text-xs text-zinc-500 mt-1">{key}</p>
                  </div>
                ))}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                  <p className="text-sm text-blue-800 font-medium">Exemple curl :</p>
                  <code className="text-xs text-blue-700 block mt-1 break-all">
                    curl -X POST "{API}/import/auto?import_type=materials" -F "file=@matieres.csv"
                  </code>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* SFTP Tab */}
        <TabsContent value="sftp">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <FolderOpen size={20} className="text-[#002FA7]" /> Surveillance du dossier
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <Label className="text-xs text-zinc-500 uppercase">Dossier surveille</Label>
                  <p className="font-mono text-sm mt-1">{importStatus?.watch_directory || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <Label className="text-xs text-zinc-500 uppercase">Fichiers en attente</Label>
                  <p className="text-2xl font-bold mt-1">{importStatus?.pending_files?.length || 0}</p>
                  {importStatus?.pending_files?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {importStatus.pending_files.map(f => (
                        <p key={f} className="text-xs font-mono text-zinc-600">{f}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <Label className="text-xs text-zinc-500 uppercase">Fichiers traites</Label>
                  <p className="text-2xl font-bold mt-1">{importStatus?.processed_count || 0}</p>
                </div>
                <Button onClick={handleSftpScan} disabled={scanning} className="w-full bg-[#002FA7] hover:bg-[#002482]" data-testid="sftp-scan-btn">
                  <ArrowClockwise size={18} className={"mr-2 " + (scanning ? "animate-spin" : "")} />
                  {scanning ? "Scan en cours..." : "Lancer le scan maintenant"}
                </Button>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Convention de nommage</h3>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">Le type d'import est determine par le prefixe du fichier :</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                    <FileText size={18} className="text-[#002FA7] shrink-0" />
                    <div>
                      <p className="font-mono text-sm font-medium">materials_*.csv</p>
                      <p className="text-xs text-zinc-500">Import de matieres premieres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                    <FileText size={18} className="text-[#10B981] shrink-0" />
                    <div>
                      <p className="font-mono text-sm font-medium">recettes_*.csv / recipes_*.csv</p>
                      <p className="text-xs text-zinc-500">Import de recettes simples</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                    <FileText size={18} className="text-amber-500 shrink-0" />
                    <div>
                      <p className="font-mono text-sm font-medium">bom_*.csv / arbre_*.csv</p>
                      <p className="text-xs text-zinc-500">Import d'arbre de fabrication avec sous-recettes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-[#002FA7]" /> Historique des imports
            </h3>
            {(!importStatus?.recent_imports || importStatus.recent_imports.length === 0) ? (
              <div className="text-center py-8 text-zinc-500">
                <Clock size={40} className="mx-auto mb-3 text-zinc-300" />
                <p>Aucun import recent</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...importStatus.recent_imports].reverse().map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-zinc-100 rounded-lg hover:bg-zinc-50" data-testid={"import-log-" + idx}>
                    <div className="flex items-center gap-3">
                      {log.result?.success ? (
                        <CheckCircle size={20} className="text-[#10B981] shrink-0" />
                      ) : (
                        <XCircle size={20} className="text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm text-zinc-900">{log.filename}</p>
                        <p className="text-xs text-zinc-500">
                          {log.import_type} via {log.source} - {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-zinc-900">
                        {log.result?.imported_count || 0} importe(s)
                      </p>
                      {log.result?.errors?.length > 0 && (
                        <p className="text-xs text-red-500">{log.result.errors.length} erreur(s)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
