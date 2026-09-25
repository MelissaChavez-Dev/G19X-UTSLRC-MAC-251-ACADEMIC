import firebase_admin
firebase_admin.initialize_app()
from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
from google import genai
import json

GEMINI_API_KEY = SecretParam("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.5-flash-lite"


@https_fn.on_call(secrets=[GEMINI_API_KEY], region="us-central1")
def generate_strategy(req: https_fn.CallableRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY.value)

    org_metrics = req.data.get("orgMetrics", {})
    department_risk = req.data.get("departmentRisk", [])
    open_comments = req.data.get("openComments", [])

    prompt = f"""
Eres un consultor experto en salud organizacional y factores psicosociales
en el trabajo (marco ISO 45003). Analiza los siguientes datos agregados de
una empresa de desarrollo de software y capacitación tecnológica, y genera
un análisis breve seguido de exactamente 3 recomendaciones accionables.

DATOS AGREGADOS DE LA ORGANIZACION (ultimos 30 dias):
{json.dumps(org_metrics, ensure_ascii=False, indent=2)}

RIESGO POR DEPARTAMENTO (escala 1-5 por factor, tier de riesgo):
{json.dumps(department_risk, ensure_ascii=False, indent=2)}

COMENTARIOS ABIERTOS RECIENTES DEL PERSONAL:
{json.dumps(open_comments[-40:], ensure_ascii=False, indent=2)}

Responde en espanol, en formato Markdown, con esta estructura exacta:

**Resumen ejecutivo:** (1-2 oraciones sobre el estado general y el tono de los comentarios)

**Necesidades principales:** (2-4 necesidades concretas mencionadas o inferidas de los comentarios; indica el departamento cuando sea posible)

**Acciones recomendadas:**
1. **[Título corto]** — Acción concreta, responsable sugerido y área prioritaria (máximo 2 líneas).
2. **[Título corto]** — Acción concreta, responsable sugerido y área prioritaria (máximo 2 líneas).
3. **[Título corto]** — Acción concreta, responsable sugerido y área prioritaria (máximo 2 líneas).

No inventes testimonios ni atribuyas comentarios a personas. No repitas los datos numéricos tal cual, interprétalos. No agregues introducciones ni despedidas.
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return {"markdown": response.text}
    except Exception as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAVAILABLE,
            message="El modelo de IA está temporalmente saturado. Intenta de nuevo en unos momentos.",
        ) from e


@https_fn.on_call(secrets=[GEMINI_API_KEY], region="us-central1")
def explain_metric(req: https_fn.CallableRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY.value)

    label = req.data.get("label", "")
    context_data = req.data.get("context", {})

    prompt = f"""
Eres un consultor de salud organizacional. Un directivo acaba de expandir
la siguiente métrica en un dashboard ejecutivo y quiere una explicación breve.

METRICA: {label}
DATOS: {json.dumps(context_data, ensure_ascii=False, indent=2)}

Responde en espanol, en 2-3 oraciones como maximo, en tono ejecutivo y directo.
No repitas los numeros tal cual, interpretalos. No agregues titulos ni listas.
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        return {"explanation": response.text}
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {"explanation": "Se alcanzó el límite diario de consultas a la IA en el nivel gratuito. Vuelve a intentar mañana, o activa facturación en Google AI Studio para límites más altos."}
        return {"explanation": f"No se pudo generar la explicación en este momento ({error_str[:80]})."}


@https_fn.on_call(secrets=[GEMINI_API_KEY], region="us-central1")
def classify_sentiment(req: https_fn.CallableRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY.value)

    comments = req.data.get("comments", [])  # [{ "id": "...", "text": "..." }, ...]
    if not comments:
        return {"results": []}

    numbered = "\n".join(f"{i}: {c['text']}" for i, c in enumerate(comments))

    prompt = f"""
Clasifica el sentimiento de cada comentario de empleados. Responde
UNICAMENTE con un array JSON valido, sin texto adicional, con este formato:
[{{"index": 0, "sentiment": "positive"}}, {{"index": 1, "sentiment": "negative"}}, ...]

Los valores de "sentiment" deben ser exactamente: "positive", "neutral" o "negative".

COMENTARIOS:
{numbered}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
        cleaned = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        classifications = json.loads(cleaned)

        results = []
        for c in classifications:
            idx = c.get("index")
            if idx is not None and 0 <= idx < len(comments):
                results.append({"id": comments[idx]["id"], "sentiment": c.get("sentiment", "neutral")})
        return {"results": results}
    except Exception as e:
        # Si Gemini no devuelve JSON valido, no tumbamos el dashboard: regresamos neutral por defecto
        return {"results": [{"id": c["id"], "sentiment": "neutral"} for c in comments], "error": str(e)[:120]}