import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Materials from "@/pages/Materials";
import Recipes from "@/pages/Recipes";
import RecipeDetail from "@/pages/RecipeDetail";
import Overheads from "@/pages/Overheads";
import Login from "@/pages/Login";
import Suppliers from "@/pages/Suppliers";
import Categories from "@/pages/Categories";
import CostsTable from "@/pages/CostsTable";
import Comparison from "@/pages/Comparison";
import BOMTree from "@/pages/BOMTree";
import ImportCenter from "@/pages/ImportCenter";
import UserManagement from "@/pages/UserManagement";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }
  if (!user || user === false) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }
  if (user && user !== false) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="materials" element={<Materials />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />
        <Route path="overheads" element={<Overheads />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="categories" element={<Categories />} />
        <Route path="costs-table" element={<CostsTable />} />
        <Route path="comparison" element={<Comparison />} />
        <Route path="bom" element={<BOMTree />} />
        <Route path="import-center" element={<ImportCenter />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
