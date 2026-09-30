import firebase_admin
firebase_admin.initialize_app()
from firebase_functions import https_fn, options, scheduler_fn
from firebase_functions.params import SecretParam
from firebase_admin import auth as admin_auth
from firebase_admin import firestore as admin_firestore
from google import genai
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import datetime, time as dt_time, timezone
import secrets
import string
import json

GEMINI_API_KEY = SecretParam("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.5-flash-lite"


def _local_tz():
    """Zona horaria del negocio. Se resuelve de forma perezosa para que el
    análisis local (firebase deploy) no falle en máquinas sin tzdata."""
    try:
        return ZoneInfo("America/Hermosillo")
    except ZoneInfoNotFoundError:
        return timezone.utc


# ============================================================
# Utilidades internas
# ============================================================

def _db():
    return admin_firestore.client()


def _require_auth(req: https_fn.CallableRequest):
    if req.auth is None:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Debes iniciar sesión.",
        )
    return req.auth


def _require_admin(req: https_fn.CallableRequest):
    auth = _require_auth(req)
    if auth.token.get("role") != "admin":
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo la administración puede realizar esta acción.",
        )
    return auth


def _generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_join_code() -> str:
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # sin caracteres ambiguos
    return "-".join(
        "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2)
    )


def _add_to_team(db, team_id: str, uid: str, display_name: str) -> None:
    """Agrega al miembro al equipo, manteniendo memberIds (reglas) y
    memberNames (directorio legible sin leer toda la colección users)."""
    db.collection("teams").document(team_id).update({
        "memberIds": admin_firestore.ArrayUnion([uid]),
        f"memberNames.{uid}": display_name,
    })


def _remove_from_team(db, team_id: str, uid: str) -> None:
    db.collection("teams").document(team_id).update({
        "memberIds": admin_firestore.ArrayRemove([uid]),
        f"memberNames.{uid}": admin_firestore.DELETE_FIELD,
    })


# ============================================================
# Fase A — Roles y alta de usuarios
# ============================================================

@https_fn.on_call(region="us-central1")
def bootstrap_admin(req: https_fn.CallableRequest) -> dict:
    """Otorga rol admin a la primera cuenta del sistema (migración desde el MVP).
    Solo funciona si todavía no existe ningún admin en Firestore."""
    auth = _require_auth(req)
    existing_role = auth.token.get("role")
    if existing_role:
        return {"role": existing_role}

    db = _db()
    admins = db.collection("users").where("role", "==", "admin").limit(1).get()
    if len(admins) > 0:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Ya existe una cuenta de administración. Pide acceso a la administradora.",
        )

    admin_auth.set_custom_user_claims(auth.uid, {"role": "admin"})
    db.collection("users").document(auth.uid).set({
        "displayName": auth.token.get("name") or "",
        "email": (auth.token.get("email") or "").lower(),
        "role": "admin",
        "departmentId": None,
        "teamId": None,
        "mustChangePassword": False,
        "active": True,
        "createdBy": auth.uid,
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    }, merge=True)
    return {"role": "admin"}


@https_fn.on_call(region="us-central1")
def create_employee_account(req: https_fn.CallableRequest) -> dict:
    """Crea una cuenta de colaborador con contraseña temporal (solo admin)."""
    caller = _require_admin(req)
    data = req.data or {}

    display_name = (data.get("displayName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role = data.get("role") or "employee"
    department_id = data.get("departmentId")
    team_id = data.get("teamId")
    work_schedule = data.get("workSchedule") or {}

    if not display_name or not email:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Nombre y correo son obligatorios.",
        )
    if role not in ("employee", "team_lead", "admin"):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Rol no válido.",
        )

    temp_password = _generate_temp_password()
    try:
        user = admin_auth.create_user(
            email=email, password=temp_password, display_name=display_name
        )
    except admin_auth.EmailAlreadyExistsError as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
            message="Ya existe una cuenta con ese correo.",
        ) from e

    admin_auth.set_custom_user_claims(user.uid, {"role": role})

    db = _db()
    db.collection("users").document(user.uid).set({
        "displayName": display_name,
        "email": email,
        "role": role,
        "departmentId": department_id,
        "teamId": team_id,
        "workSchedule": work_schedule,
        "mustChangePassword": True,
        "active": True,
        "createdBy": caller.uid,
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    })

    if team_id:
        _add_to_team(db, team_id, user.uid, display_name)

    return {"uid": user.uid, "temporaryPassword": temp_password}


@https_fn.on_call(region="us-central1")
def update_user_account(req: https_fn.CallableRequest) -> dict:
    """Actualiza rol, departamento, equipo, horario o estado de un usuario (solo admin)."""
    _require_admin(req)
    data = req.data or {}
    uid = data.get("uid")
    if not uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Falta el uid del usuario.",
        )

    updates = {}
    for field in ("displayName", "departmentId", "teamId", "workSchedule"):
        if field in data:
            updates[field] = data[field]

    if "active" in data:
        updates["active"] = bool(data["active"])
        admin_auth.update_user(uid, disabled=not data["active"])

    role = data.get("role")
    if role in ("employee", "team_lead", "admin"):
        updates["role"] = role
        admin_auth.set_custom_user_claims(uid, {"role": role})

    db = _db()
    if updates:
        db.collection("users").document(uid).set(updates, merge=True)

    # Reasignación de equipo: saca del anterior y agrega al nuevo
    if "teamId" in data:
        current = db.collection("users").document(uid).get()
        current_data = current.to_dict() or {}
        old_team = current_data.get("teamId")
        new_team = data.get("teamId")
        name = updates.get("displayName") or current_data.get("displayName") or ""
        if old_team and old_team != new_team:
            _remove_from_team(db, old_team, uid)
        if new_team and old_team != new_team:
            _add_to_team(db, new_team, uid, name)

    return {"ok": True}


# ============================================================
# Fase B — Equipos de trabajo
# ============================================================

@https_fn.on_call(region="us-central1")
def create_team(req: https_fn.CallableRequest) -> dict:
    """Crea un equipo con su código de autounión (solo admin)."""
    caller = _require_admin(req)
    data = req.data or {}

    name = (data.get("name") or "").strip()
    department_id = data.get("departmentId")
    if not name or not department_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Nombre y departamento son obligatorios.",
        )

    join_code = _generate_join_code()
    ref = _db().collection("teams").document()
    ref.set({
        "name": name,
        "departmentId": department_id,
        "joinCode": join_code,
        "createdBy": caller.uid,
        "memberIds": [],
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    })
    return {"teamId": ref.id, "joinCode": join_code}


@https_fn.on_call(region="us-central1")
def join_team_by_code(req: https_fn.CallableRequest) -> dict:
    """Une al usuario autenticado a un equipo mediante su código de unión."""
    auth = _require_auth(req)
    code = ((req.data or {}).get("code") or "").strip().upper()
    if not code:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Ingresa un código de equipo.",
        )

    db = _db()
    matches = db.collection("teams").where("joinCode", "==", code).limit(1).get()
    if not matches:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Código no válido. Verifícalo con tu administradora.",
        )

    team = matches[0]
    profile_snap = db.collection("users").document(auth.uid).get()
    display_name = (profile_snap.to_dict() or {}).get("displayName") or auth.token.get("name") or ""
    _add_to_team(db, team.id, auth.uid, display_name)
    db.collection("users").document(auth.uid).set({"teamId": team.id}, merge=True)

    return {"teamId": team.id, "teamName": team.get("name")}


# ============================================================
# Fase E — Medidor de ausentismo (presencia digital)
# ============================================================

@scheduler_fn.on_schedule(
    schedule="every day 23:30",
    timezone="America/Hermosillo",
    region="us-central1",
)
def compute_daily_presence(event: scheduler_fn.ScheduledEvent) -> None:
    """Al final de cada día laboral, resume la presencia digital de cada
    colaborador activo en presenceSummary/{userId}_{date}."""
    db = _db()
    local_tz = _local_tz()
    now = datetime.now(local_tz)
    weekday_keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    today_key = weekday_keys[now.weekday()]
    date_str = now.strftime("%Y-%m-%d")

    users = db.collection("users").where("active", "==", True).get()

    for user_doc in users:
        profile = user_doc.to_dict()
        schedule = profile.get("workSchedule") or {}
        days = schedule.get("days") or []
        if today_key not in days:
            continue

        try:
            start_parts = [int(p) for p in schedule.get("startTime", "09:00").split(":")]
            end_parts = [int(p) for p in schedule.get("endTime", "18:00").split(":")]
        except ValueError:
            continue

        window_start = datetime.combine(now.date(), dt_time(*start_parts), tzinfo=local_tz)
        window_end = datetime.combine(now.date(), dt_time(*end_parts), tzinfo=local_tz)

        logs = (
            db.collection("activityLogs")
            .where("userId", "==", user_doc.id)
            .where("timestamp", ">=", window_start)
            .where("timestamp", "<=", window_end)
            .limit(1)
            .get()
        )

        db.collection("presenceSummary").document(f"{user_doc.id}_{date_str}").set({
            "userId": user_doc.id,
            "departmentId": profile.get("departmentId"),
            "teamId": profile.get("teamId"),
            "date": date_str,
            "present": len(logs) > 0,
            "workDay": True,
            "computedAt": admin_firestore.SERVER_TIMESTAMP,
        })


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