import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CurrencyCircleDollar, EnvelopeSimple, Lock, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Une erreur est survenue. Veuillez réessayer.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Connexion réussie !");
      } else {
        const { register } = await import("@/context/AuthContext").then(m => ({ register: m.useAuth }));
        // For registration, we need to use the auth context directly
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(formatApiErrorDetail(data.detail));
        }
        
        toast.success("Compte créé avec succès !");
        window.location.reload(); // Refresh to update auth state
      }
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail 
        ? formatApiErrorDetail(error.response.data.detail)
        : error.message || "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-[#002FA7]">
            <CurrencyCircleDollar size={40} weight="bold" />
            <span className="text-2xl font-extrabold font-['Manrope']">PrixRevient</span>
          </div>
          <p className="text-zinc-500 mt-2">Calculateur de prix de revient</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-sm" data-testid="auth-card">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6 text-center font-['Manrope']" data-testid="auth-title">
            {isLogin ? "Connexion" : "Créer un compte"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Jean Dupont"
                    className="pl-10"
                    required={!isLogin}
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vous@exemple.com"
                  className="pl-10"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#002FA7] hover:bg-[#002482]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? "Chargement..." : (isLogin ? "Se connecter" : "Créer le compte")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-[#002FA7] hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm" data-testid="demo-credentials">
          <p className="font-medium text-blue-900 mb-1">Compte de démonstration :</p>
          <p className="text-blue-700">Email: admin@example.com</p>
          <p className="text-blue-700">Mot de passe: Admin123!</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
