import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { 
  House, 
  Package, 
  CookingPot, 
  Gear,
  CurrencyCircleDollar,
  SignOut,
  User,
  CaretLeft,
  CaretRight,
  Truck,
  Tag,
  ChartLine,
  Table,
  TreeStructure
} from "@phosphor-icons/react";
import { toast } from "sonner";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: "/", icon: House, label: "Tableau de bord" },
    { to: "/materials", icon: Package, label: "Matières premières" },
    { to: "/recipes", icon: CookingPot, label: "Recettes" },
    { to: "/bom", icon: TreeStructure, label: "Arbre fabrication" },
    { to: "/overheads", icon: Gear, label: "Frais généraux" },
    { to: "/suppliers", icon: Truck, label: "Fournisseurs" },
    { to: "/categories", icon: Tag, label: "Catégories" },
    { to: "/costs-table", icon: Table, label: "Tableau des coûts" },
    { to: "/comparison", icon: ChartLine, label: "Comparaison" },
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
      <aside 
        className={`sidebar transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`} 
        style={{ width: collapsed ? '64px' : '256px' }}
        data-testid="sidebar"
      >
        <div className={`sidebar-brand ${collapsed ? 'justify-center px-2' : ''}`} data-testid="sidebar-brand">
          <CurrencyCircleDollar size={24} weight="bold" className={collapsed ? '' : 'mr-2'} />
          {!collapsed && <span>PrixRevient</span>}
        </div>
        
        {/* Toggle button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 shadow-sm hover:bg-zinc-50 z-50"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
        </button>
        
        <nav className="sidebar-nav flex-1 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""} ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={collapsed ? item.label : undefined}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={20} weight="regular" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        
        {/* User section */}
        <div className="mt-auto border-t border-zinc-200 pt-4">
          {!collapsed && (
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
          )}
          <button
            onClick={handleLogout}
            className={`sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700 ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? "Déconnexion" : undefined}
            data-testid="logout-btn"
          >
            <SignOut size={20} weight="regular" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className="main-content transition-all duration-300" 
        style={{ marginLeft: collapsed ? '64px' : '256px' }}
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
