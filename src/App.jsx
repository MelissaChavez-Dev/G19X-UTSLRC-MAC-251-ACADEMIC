import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import WellnessSurvey from "./pages/WellnessSurvey";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import SurveyBuilder from "./pages/SurveyBuilder";
import MiEspacio from "./pages/MiEspacio";
import MiEquipo from "./pages/MiEquipo";
import SurveyRunner from "./pages/SurveyRunner";
import TeamBoard from "./pages/TeamBoard";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import UserManagement from "./pages/admin/UserManagement";
import TeamDirectory from "./pages/admin/TeamDirectory";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { SidebarStateProvider } from "./hooks/useSidebarState";
import { logNavigation } from "./services/activityService";

/** Registra la navegación dentro de la app como presencia digital (throttled). */
function NavigationLogger() {
  const location = useLocation();
  useEffect(() => {
    logNavigation();
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarStateProvider>
          <BrowserRouter>
          <NavigationLogger />
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/survey" element={<WellnessSurvey />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/cambiar-password"
              element={
                <ProtectedRoute skipPasswordCheck>
                  <ForcePasswordChange />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey-builder/:templateId?"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <SurveyBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-espacio"
              element={
                <ProtectedRoute roles={["employee", "team_lead"]}>
                  <MiEspacio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/encuesta/:templateId"
              element={
                <ProtectedRoute roles={["employee", "team_lead", "admin"]}>
                  <SurveyRunner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipos"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <TeamDirectory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipos/:teamId"
              element={
                <ProtectedRoute roles={["admin", "team_lead"]}>
                  <TeamBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-equipo"
              element={
                <ProtectedRoute roles={["team_lead"]}>
                  <MiEquipo />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        </SidebarStateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;