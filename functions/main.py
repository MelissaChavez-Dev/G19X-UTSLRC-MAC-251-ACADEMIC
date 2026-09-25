import firebase_admin
firebase_admin.initialize_app()

from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
from google import genai
import json

GEMINI_API_KEY = SecretParam("GEMINI_API_KEY")


@https_fn.on_call(secrets=[GEMINI_API_KEY], region="us-central1")
def generate_strategy(req: https_fn.CallableRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY.value)

    org_metrics = req.data.get("orgMetrics", {})
    department_risk = req.data.get("departmentRisk", [])

    prompt = f"""
Eres un consultor experto en salud organizacional y factores psicosociales
en el trabajo (marco ISO 45003). Analiza los siguientes datos agregados de
una empresa de desarrollo de software y capacitación tecnológica, y genera
un análisis breve seguido de exactamente 3 recomendaciones accionables.

DATOS AGREGADOS DE LA ORGANIZACION (ultimos 30 dias):
{json.dumps(org_metrics, ensure_ascii=False, indent=2)}

RIESGO POR DEPARTAMENTO (escala 1-5 por factor, tier de riesgo):
{json.dumps(department_risk, ensure_ascii=False, indent=2)}

Responde en espanol, en formato Markdown, con esta estructura exacta:

**Diagnóstico general:** (1-2 oraciones, tono ejecutivo, directo)

1. **[Título corto de la recomendación]** — Descripción breve de la acción concreta (máximo 2 líneas).
2. **[Título corto de la recomendación]** — Descripción breve de la acción concreta (máximo 2 líneas).
3. **[Título corto de la recomendación]** — Descripción breve de la acción concreta (máximo 2 líneas).

No agregues introducciones ni despedidas. No repitas los datos numéricos tal cual, interprétalos.
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.-flash",
            contents=prompt,
        )
    except Exception as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAVAILABLE,
            message="El modelo de IA está temporalmente saturado. Intenta de nuevo en unos momentos.",
        ) from e

    return {"markdown": response.text}