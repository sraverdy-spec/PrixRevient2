import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  House, 
  Package, 
  CookingPot, 
  Gear,
  CurrencyCircleDollar,
  SignOut,
  User
} from "@phosphor-icons/react";
import { toast } from "sonner";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/", icon: House, label: "Tableau de bord" },
    { to: "/materials", icon: Package, label: "Matières premières" },
    { to: "/recipes", icon: CookingPot, label: "Recettes" },
    { to: "/overheads", icon: Gear, label: "Frais généraux" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <div className="app-layout" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="sidebar" data-testid="sidebar">
        <div className="sidebar-brand" data-testid="sidebar-brand">
          <CurrencyCircleDollar size={24} weight="bold" className="inline mr-2" />
          PrixRevient
        </div>
        <nav className="sidebar-nav flex-1" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={20} weight="regular" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        
        {/* User section */}
        <div className="mt-auto border-t border-zinc-200 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#002FA7] flex items-center justify-center">
              <User size={16} weight="bold" className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate" data-testid="user-name">
                {user?.name || "Utilisateur"}
              </p>
              <p className="text-xs text-zinc-500 truncate" data-testid="user-email">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            data-testid="logout-btn"
          >
            <SignOut size={20} weight="regular" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
