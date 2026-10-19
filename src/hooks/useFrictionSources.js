import { useEffect, useState } from "react";
import { listDashboardResponses } from "../services/responseService";
import { listTemplates } from "../services/templateService";
import { summarizeFrictionSources } from "../utils/surveySourceUtils.js";

export function useFrictionSources(departmentId = null) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [responses, templates] = await Promise.all([
          listDashboardResponses(30),
          listTemplates(),
        ]);
        const filteredResponses = responses.filter(
          (response) => !departmentId || response.departmentId === departmentId
        );
        if (active) {
          setSources(summarizeFrictionSources(filteredResponses, templates));
        }
      } catch (loadError) {
        console.error("No se pudieron cargar las fuentes de fricción:", loadError);
        if (active) setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [departmentId]);

  return { sources, loading, error };
}
