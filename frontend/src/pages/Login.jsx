import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { CurrencyCircleDollar, EnvelopeSimple, Lock, GoogleLogo, MicrosoftOutlookLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Une erreur est survenue.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [settings, setSettings] = useState(null);
  const [ssoStatus, setSsoStatus] = useState({ google_enabled: false, microsoft_enabled: false });

  useEffect(() => {
    axios.get(API + "/settings").then(r => setSettings(r.data)).catch(() => {});
    axios.get(API + "/auth/sso/status").then(r => setSsoStatus(r.data)).catch(() => {});
  }, []);

  const primaryColor = settings?.primary_color || "#002FA7";
  const companyName = settings?.company_name || "PrixRevient";
  const logoData = settings?.logo_data || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast.success("Connexion reussie !");
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail
        ? formatApiErrorDetail(error.response.data.detail)
        : error.message || "Erreur de connexion";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async (provider) => {
    try {
      const res = await axios.get(`${API}/auth/sso/${provider}/url`);
      window.location.href = res.data.url;
    } catch {
      toast.error(`SSO ${provider} non disponible`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {logoData ? (
            <div className="flex flex-col items-center gap-3">
              <img src={logoData} alt="Logo" className="h-14 w-auto object-contain" data-testid="login-logo" />
              <span className="text-2xl font-extrabold font-['Manrope']" style={{ color: primaryColor }}>{companyName}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2" style={{ color: primaryColor }}>
              <CurrencyCircleDollar size={40} weight="bold" />
              <span className="text-2xl font-extrabold font-['Manrope']">{companyName}</span>
            </div>
          )}
          <p className="text-zinc-500 mt-2">Calculateur de prix de revient</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm" data-testid="auth-card">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6 text-center font-['Manrope']" data-testid="auth-title">
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email" type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vous@exemple.com" className="pl-10" required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password" type="password" value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Votre mot de passe" className="pl-10" required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button type="submit" className="w-full text-white" style={{ backgroundColor: primaryColor }} disabled={loading} data-testid="submit-btn">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          {(ssoStatus.google_enabled || ssoStatus.microsoft_enabled) && (
            <div className="mt-5">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-zinc-400">ou continuer avec</span></div>
              </div>
              <div className="space-y-2">
                {ssoStatus.google_enabled && (
                  <Button variant="outline" className="w-full" onClick={() => handleSSOLogin("google")} data-testid="sso-google-btn">
                    <GoogleLogo size={18} weight="bold" className="mr-2 text-red-500" /> Google
                  </Button>
                )}
                {ssoStatus.microsoft_enabled && (
                  <Button variant="outline" className="w-full" onClick={() => handleSSOLogin("microsoft")} data-testid="sso-microsoft-btn">
                    <MicrosoftOutlookLogo size={18} weight="bold" className="mr-2 text-blue-500" /> Microsoft
                  </Button>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-zinc-400">
            Contactez l'administrateur pour obtenir un compte
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
