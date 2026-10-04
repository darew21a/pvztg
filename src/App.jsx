import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import LoadingState from "./components/ui/LoadingState.jsx";
const AnalisisCombustiblePage = lazy(() => import("./pages/AnalisisCombustiblePage.jsx"));
const AuditoriaEdenredPage = lazy(() => import("./pages/AuditoriaEdenredPage.jsx"));
const AuditoriaTicketsBombaPage = lazy(() => import("./pages/AuditoriaTicketsBombaPage.jsx"));
const AuditorPerfilPage = lazy(() => import("./pages/AuditorPerfilPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const GestionAccesosPage = lazy(() => import("./pages/GestionAccesosPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const ModuloFlotaPage = lazy(() => import("./pages/ModuloFlotaPage.jsx"));
const ReportesPage = lazy(() => import("./pages/ReportesPage.jsx"));
const AdminLoginPage = lazy(() => import("./pages/auth/AdminLoginPage.jsx"));
const ChangePasswordPage = lazy(() => import("./pages/auth/ChangePasswordPage.jsx"));
const JefeDepartamentoLoginPage = lazy(() => import("./pages/auth/JefeDepartamentoLoginPage.jsx"));
const JefeDepartamentoDashboardPage = lazy(() => import("./pages/jefeDepartamento/JefeDepartamentoDashboardPage.jsx"));

function App() {
  return (
    <Suspense fallback={<LoadingState label="Abriendo el módulo" fullScreen />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cambiar-contrasena" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login/jefe-departamento" element={<JefeDepartamentoLoginPage />} />

        <Route element={<ProtectedRoute allowedRoles={["apv", "stt"]} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/flota" element={<ModuloFlotaPage />} />
            <Route path="/indice-unidades" element={<ModuloFlotaPage />} />
            <Route path="/auditoria-edenred" element={<AuditoriaEdenredPage />} />
            <Route path="/analisis-combustible" element={<AnalisisCombustiblePage />} />
            <Route path="/tickets-combustible" element={<AuditoriaTicketsBombaPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["stt"]} fallbackRoute="/dashboard" />}>
          <Route element={<AppLayout />}>
            <Route path="/accesos" element={<GestionAccesosPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["apv", "stt", "jefe-departamento"]} fallbackRoute="/dashboard" />}>
          <Route element={<AppLayout />}>
            <Route path="/perfil" element={<AuditorPerfilPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["jefe-departamento"]} fallbackRoute="/dashboard" />}>
          <Route path="/jefe-departamento" element={<JefeDepartamentoDashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
