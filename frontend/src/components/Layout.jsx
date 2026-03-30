import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  House, Package, CookingPot, Gear,
  CurrencyCircleDollar, SignOut, User, CaretLeft, CaretRight,
  Truck, Tag, ChartLine, Table, TreeStructure, GearSix
} from "@phosphor-icons/react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const Layout = () => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState(null);

  const fetchSettings = () => {
    axios.get(API + "/settings").then(res => setSettings(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchSettings();
    const handler = () => fetchSettings();
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, []);

  const s = settings || {};
  const primaryColor = s.primary_color || "#002FA7";
  const sidebarBg = s.sidebar_bg || "#F4F4F5";
  const sidebarActiveBg = s.sidebar_active_bg || primaryColor;
  const sidebarActiveText = s.sidebar_active_text || "#FFFFFF";
  const sidebarText = s.sidebar_text || "#71717A";
  const companyName = s.company_name || "PrixRevient";
  const logoData = s.logo_data || "";

  const navItems = [
    { to: "/", icon: House, label: "Tableau de bord", roles: ["admin", "manager", "operator"] },
    { to: "/materials", icon: Package, label: "Matieres premieres", roles: ["admin", "manager", "operator"] },
    { to: "/recipes", icon: CookingPot, label: "Recettes", roles: ["admin", "manager", "operator"] },
    { to: "/bom", icon: TreeStructure, label: "Arbre fabrication", roles: ["admin", "manager", "operator"] },
    { to: "/overheads", icon: Gear, label: "Frais generaux", roles: ["admin", "manager"] },
    { to: "/suppliers", icon: Truck, label: "Fournisseurs", roles: ["admin", "manager"] },
    { to: "/categories", icon: Tag, label: "Categories", roles: ["admin", "manager"] },
    { to: "/costs-table", icon: Table, label: "Tableau des couts", roles: ["admin", "manager", "operator"] },
    { to: "/comparison", icon: ChartLine, label: "Comparaison", roles: ["admin", "manager"] },
    { to: "/settings", icon: GearSix, label: "Parametres", roles: ["admin"] },
  ];

  const userRole = user?.role || "operator";
  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Deconnexion reussie");
      navigate("/login");
    } catch { toast.error("Erreur"); }
  };

  return (
    <div className="app-layout" data-testid="app-layout">
      <aside
        className={"sidebar " + (collapsed ? "collapsed" : "")}
        style={{ backgroundColor: sidebarBg, borderColor: sidebarBg === "#F4F4F5" ? "#E4E4E7" : "transparent" }}
        data-testid="sidebar"
      >
        <div className="sidebar-brand" style={{ color: primaryColor }} data-testid="sidebar-brand">
          {logoData ? (
            <img src={logoData} alt="Logo" className="sidebar-icon" style={{ width: 28, height: 28, objectFit: "contain" }} />
          ) : (
            <CurrencyCircleDollar size={24} weight="bold" className="sidebar-icon" />
          )}
          {!collapsed && <span style={{ marginLeft: "0.5rem" }}>{companyName}</span>}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 shadow-sm hover:bg-zinc-50 z-50"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
        </button>

        <nav className="sidebar-nav flex-1 overflow-y-auto" data-testid="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => isActive ? { backgroundColor: sidebarActiveBg, color: sidebarActiveText } : { color: sidebarText }}
              data-testid={"nav-" + item.label.toLowerCase().replace(/\s+/g, "-")}
            >
              <item.icon size={20} weight="regular" className="sidebar-icon" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t pt-4" style={{ borderColor: sidebarBg === "#F4F4F5" ? "#E4E4E7" : "rgba(0,0,0,0.1)" }}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                <User size={16} weight="bold" className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate" data-testid="user-name">{user?.name || "Utilisateur"}</p>
                <p className="text-xs text-zinc-500 truncate" data-testid="user-email">{user?.email}</p>
                <p className="text-[10px] mt-0.5">
                  <span className={
                    user?.role === "admin" ? "px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium" :
                    user?.role === "manager" ? "px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium" :
                    "px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded font-medium"
                  }>{user?.role === "admin" ? "Admin" : user?.role === "manager" ? "Manager" : "Operateur"}</span>
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            title={collapsed ? "Deconnexion" : undefined}
            data-testid="logout-btn"
          >
            <SignOut size={20} weight="regular" className="sidebar-icon" />
            {!collapsed && <span>Deconnexion</span>}
          </button>
        </div>
      </aside>

      <main
        className="main-content transition-all duration-300"
        style={{ marginLeft: collapsed ? "64px" : "256px" }}
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
