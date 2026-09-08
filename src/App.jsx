import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import AdminLoginPage from "./pages/auth/AdminLoginPage.jsx";
import JefeDepartamentoLoginPage from "./pages/auth/JefeDepartamentoLoginPage.jsx";
import JefeDepartamentoDashboardPage from "./pages/jefeDepartamento/JefeDepartamentoDashboardPage.jsx";
import AuditoriaEdenredPage from "./pages/AuditoriaEdenredPage.jsx";
import ModuloFlotaPage from "./pages/ModuloFlotaPage.jsx";
import GestionAccesosPage from "./pages/GestionAccesosPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ReportesPage from "./pages/ReportesPage.jsx";
import AuditorPerfilPage from "./pages/AuditorPerfilPage.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";

function App() {
  return (
    <Routes>
      {/* Pantallas de autenticación: no usan el layout con SideNavBar/TopNavBar del panel administrativo */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/login/jefe-departamento" element={<JefeDepartamentoLoginPage />} />

      {/* Panel del Jefe de Departamento: layout propio y más simple, no el SideNavBar del Administrador (alcance distinto). */}
      <Route path="/jefe-departamento" element={<JefeDepartamentoDashboardPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/flota" element={<ModuloFlotaPage />} />
        <Route path="/auditoria-edenred" element={<AuditoriaEdenredPage />} />
        <Route path="/accesos" element={<GestionAccesosPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/perfil" element={<AuditorPerfilPage />} />
      </Route>
    </Routes>
  );
}

export default App;
