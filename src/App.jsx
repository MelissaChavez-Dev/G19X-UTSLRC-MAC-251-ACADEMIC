import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { SidebarStateProvider } from "./hooks/useSidebarState";
import { logNavigation } from "./services/activityService";

const WellnessSurvey = lazy(() => import("./pages/WellnessSurvey"));
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SurveyBuilder = lazy(() => import("./pages/SurveyBuilder"));
const MiEspacio = lazy(() => import("./pages/MiEspacio"));
const MiEquipo = lazy(() => import("./pages/MiEquipo"));
const SurveyRunner = lazy(() => import("./pages/SurveyRunner"));
const TeamBoard = lazy(() => import("./pages/TeamBoard"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const DataQuality = lazy(() => import("./pages/DataQuality"));
const Attendance = lazy(() => import("./pages/admin/Attendance"));
const LeaveManagement = lazy(() => import("./pages/admin/LeaveManagement"));
const TeamDirectory = lazy(() => import("./pages/admin/TeamDirectory"));
const MisProyectos = lazy(() => import("./pages/MisProyectos"));

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
          <Suspense fallback={<LoadingScreen message="Cargando pantalla..." />}>
            <Routes>
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route
                path="/survey"
                element={
                  <ProtectedRoute roles={["employee", "admin"]}>
                    <WellnessSurvey />
                  </ProtectedRoute>
                }
              />
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
                path="/admin/calidad"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <DataQuality />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/asistencia"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/permisos"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mi-espacio"
                element={
                  <ProtectedRoute roles={["employee"]}>
                    <MiEspacio />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mis-proyectos/:teamId?"
                element={
                  <ProtectedRoute roles={["employee"]}>
                    <MisProyectos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/encuesta/:templateId"
                element={
                  <ProtectedRoute roles={["employee", "admin"]}>
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
                  <ProtectedRoute roles={["admin"]}>
                    <TeamBoard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mi-equipo"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <MiEquipo />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </SidebarStateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;