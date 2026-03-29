import { Outlet, NavLink } from "react-router-dom";
import { 
  House, 
  Package, 
  CookingPot, 
  Gear,
  CurrencyCircleDollar
} from "@phosphor-icons/react";

const Layout = () => {
  const navItems = [
    { to: "/", icon: House, label: "Tableau de bord" },
    { to: "/materials", icon: Package, label: "Matières premières" },
    { to: "/recipes", icon: CookingPot, label: "Recettes" },
    { to: "/overheads", icon: Gear, label: "Frais généraux" },
  ];

  return (
    <div className="app-layout" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="sidebar" data-testid="sidebar">
        <div className="sidebar-brand" data-testid="sidebar-brand">
          <CurrencyCircleDollar size={24} weight="bold" className="inline mr-2" />
          PrixRevient
        </div>
        <nav className="sidebar-nav" data-testid="sidebar-nav">
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
      </aside>

      {/* Main Content */}
      <main className="main-content" data-testid="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
