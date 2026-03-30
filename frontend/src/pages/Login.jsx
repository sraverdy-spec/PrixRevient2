import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CurrencyCircleDollar, EnvelopeSimple, Lock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[#002FA7]">
            <CurrencyCircleDollar size={40} weight="bold" />
            <span className="text-2xl font-extrabold font-['Manrope']">PrixRevient</span>
          </div>
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

            <Button type="submit" className="w-full bg-[#002FA7] hover:bg-[#002482]" disabled={loading} data-testid="submit-btn">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-400">
            Contactez l'administrateur pour obtenir un compte
          </p>
        </div>

        {/* fin */}
      </div>
    </div>
  );
};

export default Login;
