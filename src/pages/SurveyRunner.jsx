import { useNavigate, useParams } from "react-router-dom";
import WellnessSurvey from "./WellnessSurvey";
import { useAuth } from "../hooks/useAuth";

/**
 * Flujo de encuesta para el colaborador autenticado (/encuesta/:templateId).
 * El departamento se toma de su perfil y al terminar registra su participación.
 */
export default function SurveyRunner() {
  const { templateId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <WellnessSurvey
      templateId={templateId}
      fixedDepartmentId={profile?.departmentId || null}
      onCompleted={() => navigate("/mi-espacio")}
    />
  );
}
