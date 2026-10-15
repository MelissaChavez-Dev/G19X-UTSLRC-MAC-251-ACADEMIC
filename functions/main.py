import firebase_admin
firebase_admin.initialize_app()
from firebase_functions import firestore_fn, https_fn, options, scheduler_fn
from firebase_functions.params import SecretParam
from firebase_admin import auth as admin_auth
from firebase_admin import firestore as admin_firestore
from google import genai
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import date, datetime, time as dt_time, timedelta, timezone
import secrets
import string
import json
import re
import hashlib
import math

GEMINI_API_KEY = SecretParam("GEMINI_API_KEY")
MODEL_NAME = "gemini-3.8-flash"
EMPLOYMENT_TYPES = {"full_time", "part_time", "temporary", "contract", "intern"}
CURRENT_INSTRUMENT_VERSION = 2
CURRENT_PSYCHOSOCIAL_FIELDS = {
    "cognitiveLoad",
    "roleAmbiguity",
    "emotionalLabor",
    "shiftFatigue",
    "autonomy",
    "psychSafety",
}


def _local_tz():
    """Zona horaria del negocio. Se resuelve de forma perezosa para que el
    análisis local (firebase deploy) no falle en máquinas sin tzdata."""
    try:
        return ZoneInfo("America/Hermosillo")
    except ZoneInfoNotFoundError:
        return timezone.utc


def _weekday_of_month(year: int, month: int, weekday: int, occurrence: int):
    first = datetime(year, month, 1).date()
    offset = (weekday - first.weekday()) % 7
    return first + timedelta(days=offset + (occurrence - 1) * 7)


def _mexican_public_holidays(year: int) -> set:
    """Días de descanso obligatorio federales con fecha fija o móvil."""
    holidays = {
        datetime(year, 1, 1).date(),
        _weekday_of_month(year, 2, 0, 1),
        _weekday_of_month(year, 3, 0, 3),
        datetime(year, 5, 1).date(),
        datetime(year, 9, 16).date(),
        _weekday_of_month(year, 11, 0, 3),
        datetime(year, 12, 25).date(),
    }
    if year >= 2024 and (year - 2024) % 6 == 0:
        holidays.add(datetime(year, 10, 1).date())
    return holidays


def _count_business_days(start: date, end: date) -> int:
    count = 0
    current = start
    while current <= end:
        if current.weekday() < 5 and current not in _mexican_public_holidays(current.year):
            count += 1
        current += timedelta(days=1)
    return count


def _anniversary(hire_date: date, year: int) -> date:
    try:
        return hire_date.replace(year=year)
    except ValueError:
        return date(year, hire_date.month, 28)


def _completed_years(hire_date: date, as_of: date) -> int:
    years = as_of.year - hire_date.year
    if as_of < _anniversary(hire_date, as_of.year):
        years -= 1
    return max(0, years)


def _vacation_entitlement(years: int) -> int:
    if years <= 0:
        return 0
    if years <= 5:
        return 10 + years * 2
    return 20 + (1 + (years - 6) // 5) * 2


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


def _is_active_record(data: dict) -> bool:
    return data.get("active", True) is not False


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


def _record_departure(db, uid: str, profile: dict, reason: str) -> None:
    """Registra el evento de cuenta; los reportes excluyen las eliminaciones administrativas."""
    db.collection("departureLog").add({
        "userId": uid,
        "departmentId": profile.get("departmentId"),
        "role": profile.get("role"),
        "reason": reason,
        "recordedAt": admin_firestore.SERVER_TIMESTAMP,
    })


def _normalize_hire_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
    except (TypeError, ValueError) as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="La fecha de ingreso debe tener el formato AAAA-MM-DD.",
        ) from e


def _ensure_employee_id_available(db, employee_id: str, exclude_uid: str | None = None) -> None:
    if not employee_id:
        return
    matches = db.collection("users").where("employeeId", "==", employee_id).limit(1).get()
    if any(user.id != exclude_uid for user in matches):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
            message="El número de empleado ya está asignado.",
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


def _get_project_context(req: https_fn.CallableRequest):
    caller = _require_auth(req)
    data = req.data or {}
    team_id = (data.get("teamId") or "").strip()
    if not team_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El proyecto es obligatorio.",
        )

    db = _db()
    team_ref = db.collection("teams").document(team_id)
    snapshot = team_ref.get()
    if not snapshot.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró el proyecto.",
        )

    team = snapshot.to_dict() or {}
    is_admin = caller.token.get("role") == "admin"
    is_member = caller.uid in (team.get("memberIds") or [])
    if not is_admin and not is_member:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo los integrantes del proyecto pueden realizar esta acción.",
        )
    return caller, db, team_ref, team, is_admin


def _remove_member_and_reassign(db, team_ref, team_id: str, uid: str) -> None:
    _remove_from_team(db, team_id, uid)

    tasks = team_ref.collection("tasks").stream()
    updates_by_task = []
    for task in tasks:
        task_data = task.to_dict() or {}
        assignees = task_data.get("assignedToIds") or []
        if uid not in assignees and task_data.get("assignedTo") != uid:
            continue
        updates = {
            "assignedToIds": admin_firestore.ArrayRemove([uid]),
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        }
        if task_data.get("assignedTo") == uid:
            remaining = [member_id for member_id in assignees if member_id != uid]
            updates["assignedTo"] = remaining[0] if remaining else None
        updates_by_task.append((task.reference, updates))

    for offset in range(0, len(updates_by_task), 400):
        batch = db.batch()
        for task_ref, updates in updates_by_task[offset:offset + 400]:
            batch.update(task_ref, updates)
        batch.commit()

    profile_ref = db.collection("users").document(uid)
    profile_snapshot = profile_ref.get()
    profile = profile_snapshot.to_dict() or {}
    if profile.get("teamId") == team_id:
        other_teams = db.collection("teams").where(
            "memberIds", "array_contains", uid
        ).limit(1).get()
        next_team_id = next((item.id for item in other_teams if item.id != team_id), None)
        profile_ref.set({"teamId": next_team_id}, merge=True)


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
def sync_admin_claim(req: https_fn.CallableRequest) -> dict:
    """Restaura el custom claim solo si el perfil privado ya asigna admin."""
    auth = _require_auth(req)
    profile_snapshot = _db().collection("users").document(auth.uid).get()
    profile = profile_snapshot.to_dict() or {}
    if not profile_snapshot.exists or profile.get("role") != "admin" or not _is_active_record(profile):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo una cuenta admin activa puede sincronizar este rol.",
        )

    user = admin_auth.get_user(auth.uid)
    custom_claims = dict(user.custom_claims or {})
    if custom_claims.get("role") != "admin":
        custom_claims["role"] = "admin"
        admin_auth.set_custom_user_claims(auth.uid, custom_claims)

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
    employee_id = (data.get("employeeId") or "").strip().upper()
    job_title = (data.get("jobTitle") or "").strip()
    employment_type = data.get("employmentType") or "full_time"
    hire_date = _normalize_hire_date(data.get("hireDate"))

    if not display_name or not email:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Nombre y correo son obligatorios.",
        )
    if role not in ("employee", "admin"):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Rol no válido.",
        )
    if employee_id and (len(employee_id) > 20 or not re.fullmatch(r"[A-Z0-9-]+", employee_id)):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El número de empleado solo admite letras, números y guiones (máximo 20 caracteres).",
        )
    if len(job_title) > 100:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El puesto no puede superar 100 caracteres.",
        )
    if employment_type not in EMPLOYMENT_TYPES:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El tipo de contratación no es válido.",
        )

    db = _db()
    _ensure_employee_id_available(db, employee_id)
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

    employee_id = employee_id or f"EMP-{user.uid[:8].upper()}"
    db.collection("users").document(user.uid).set({
        "displayName": display_name,
        "email": email,
        "employeeId": employee_id,
        "jobTitle": job_title,
        "employmentType": employment_type,
        "hireDate": hire_date,
        "phone": "",
        "role": role,
        "departmentId": department_id,
        "teamId": team_id,
        "workSchedule": work_schedule,
        "mustChangePassword": True,
        "active": True,
        "createdBy": caller.uid,
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    })
    db.collection("publicProfiles").document(user.uid).set({
        "displayName": display_name,
        "photoURL": "",
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    })

    if team_id:
        _add_to_team(db, team_id, user.uid, display_name)

    return {"uid": user.uid, "employeeId": employee_id, "temporaryPassword": temp_password}


@https_fn.on_call(region="us-central1")
def update_user_account(req: https_fn.CallableRequest) -> dict:
    """Actualiza datos de cuenta de un usuario (solo admin)."""
    _require_admin(req)
    data = req.data or {}
    uid = data.get("uid")
    if not uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Falta el uid del usuario.",
        )

    updates = {}
    for field in (
        "displayName", "email", "departmentId", "teamId", "workSchedule",
        "employeeId", "jobTitle", "employmentType", "hireDate",
    ):
        if field in data:
            updates[field] = data[field]

    db = _db()
    if "employeeId" in updates:
        updates["employeeId"] = (updates["employeeId"] or "").strip().upper()
        if not updates["employeeId"] or len(updates["employeeId"]) > 20 \
                or not re.fullmatch(r"[A-Z0-9-]+", updates["employeeId"]):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El número de empleado es obligatorio y solo admite letras, números y guiones (máximo 20 caracteres).",
            )
        _ensure_employee_id_available(db, updates["employeeId"], uid)
    if "jobTitle" in updates:
        updates["jobTitle"] = (updates["jobTitle"] or "").strip()
        if len(updates["jobTitle"]) > 100:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El puesto no puede superar 100 caracteres.",
            )
    if "employmentType" in updates and updates["employmentType"] not in EMPLOYMENT_TYPES:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El tipo de contratación no es válido.",
        )
    if "hireDate" in updates:
        updates["hireDate"] = _normalize_hire_date(updates["hireDate"])

    auth_updates = {}
    if "displayName" in updates:
        auth_updates["display_name"] = updates["displayName"]
    if "email" in updates:
        normalized_email = (updates["email"] or "").strip().lower()
        if not normalized_email:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El correo electrónico no puede quedar vacío.",
            )
        updates["email"] = normalized_email
        auth_updates["email"] = normalized_email

    if auth_updates:
        try:
            admin_auth.update_user(uid, **auth_updates)
        except admin_auth.EmailAlreadyExistsError as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
                message="Ese correo ya está asociado a otra cuenta.",
            ) from e
        except admin_auth.UserNotFoundError as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message="No se encontró la cuenta.",
            ) from e

    if "active" in data:
        updates["active"] = bool(data["active"])
        admin_auth.update_user(uid, disabled=not data["active"])

    role = data.get("role")
    if role in ("employee", "admin"):
        updates["role"] = role
        admin_auth.set_custom_user_claims(uid, {"role": role})

    user_ref = db.collection("users").document(uid)
    current_data = user_ref.get().to_dict() or {}
    old_team = current_data.get("teamId")
    removed_from_team_for_department = False

    if "active" in data and current_data.get("active", True) and not data["active"]:
        _record_departure(db, uid, current_data, "deactivated")

    if "departmentId" in updates and "teamId" not in data and old_team:
        old_team_snapshot = db.collection("teams").document(old_team).get()
        if old_team_snapshot.exists and old_team_snapshot.get("departmentId") != updates["departmentId"]:
            _remove_from_team(db, old_team, uid)
            updates["teamId"] = None
            removed_from_team_for_department = True

    if updates:
        user_ref.set(updates, merge=True)
    if "displayName" in updates:
        db.collection("publicProfiles").document(uid).set({
            "displayName": updates["displayName"],
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        }, merge=True)

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
    elif "displayName" in updates and not removed_from_team_for_department:
        if old_team:
            db.collection("teams").document(old_team).update({
                f"memberNames.{uid}": updates["displayName"]
            })

    return {"ok": True}


@https_fn.on_call(region="us-central1")
def update_employee_profile(req: https_fn.CallableRequest) -> dict:
    """Permite que una persona actualice su nombre visible y teléfono, no su rol ni su organización."""
    caller = _require_auth(req)
    db = _db()
    user_ref = db.collection("users").document(caller.uid)
    profile = user_ref.get().to_dict() or {}
    if not profile or profile.get("active", True) is False:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró un perfil activo para tu cuenta.",
        )
    if profile.get("role") not in {"employee"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Esta función solo está disponible para colaboradores.",
        )
    data = req.data or {}
    if set(data) - {"displayName", "phone"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Solo puedes actualizar tu nombre visible y teléfono.",
        )

    display_name = (data.get("displayName") or "").strip()
    phone = (data.get("phone") or "").strip()
    if not display_name or len(display_name) > 100:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El nombre es obligatorio y no puede superar 100 caracteres.",
        )
    if len(phone) > 30 or (phone and not re.fullmatch(r"[0-9+() .-]+", phone)):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El teléfono no tiene un formato válido.",
        )

    admin_auth.update_user(caller.uid, display_name=display_name)
    updates = {
        "displayName": display_name,
        "phone": phone,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    }
    user_ref.set(updates, merge=True)
    db.collection("publicProfiles").document(caller.uid).set({
        "displayName": display_name,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    }, merge=True)
    return {"displayName": display_name, "phone": phone}


_SURVEY_FIELD_PATHS = {
    "enps",
    "mood",
    "workLifeBalance",
    "cognitiveLoad",
    "openText",
    "psychosocialFactors.cognitiveLoad",
    "psychosocialFactors.roleAmbiguity",
    "psychosocialFactors.emotionalLabor",
    "psychosocialFactors.shiftFatigue",
    "psychosocialFactors.autonomy",
    "psychosocialFactors.psychSafety",
}
_SURVEY_NUMERIC_RANGES = {
    "enps": (0, 10),
    "workLifeBalance": (1, 10),
    "psychosocialFactors.cognitiveLoad": (1, 5),
    "psychosocialFactors.roleAmbiguity": (1, 5),
    "psychosocialFactors.emotionalLabor": (1, 5),
    "psychosocialFactors.shiftFatigue": (1, 5),
    "psychosocialFactors.autonomy": (1, 5),
    "psychosocialFactors.psychSafety": (1, 5),
}
_DEFAULT_SURVEY_QUESTIONS = [
    {"id": "enps", "type": "scale", "min": 0, "max": 10, "mapsTo": "enps", "required": True},
    {"id": "workLifeBalance", "type": "scale", "min": 1, "max": 10, "mapsTo": "workLifeBalance", "required": True},
    {"id": "cognitiveLoad", "type": "choice", "mapsTo": "cognitiveLoad", "required": True, "options": [
        {"value": "shift-handoff"}, {"value": "emr-integration"},
        {"value": "unclear-protocols"}, {"value": "balanced"},
    ]},
    {"id": "psych_cognitive_load", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.cognitiveLoad", "required": True},
    {"id": "psych_role_ambiguity", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.roleAmbiguity", "required": True},
    {"id": "psych_emotional_labor", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.emotionalLabor", "required": True},
    {"id": "psych_shift_fatigue", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.shiftFatigue", "required": True},
    {"id": "psych_autonomy", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.autonomy", "required": True},
    {"id": "psychSafety", "type": "scale", "min": 1, "max": 10, "mapsTo": "psychosocialFactors.psychSafety", "required": True},
    {"id": "openText", "type": "text", "mapsTo": "openText", "required": False},
]


def _survey_instrument_version(response: dict) -> int:
    factor_data = response.get("psychosocialFactors", {})
    return (
        CURRENT_INSTRUMENT_VERSION
        if CURRENT_PSYCHOSOCIAL_FIELDS.issubset(factor_data)
        else CURRENT_INSTRUMENT_VERSION - 1
    )


def _current_survey_cycle(cycle: str, today: date) -> str:
    iso_year, iso_week, _ = today.isocalendar()
    if cycle == "once":
        return "unica"
    if cycle == "biweekly":
        return f"{iso_year}-Q{(iso_week + 1) // 2:02d}"
    if cycle == "weekly":
        return f"{iso_year}-W{iso_week:02d}"
    raise https_fn.HttpsError(
        code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
        message="La periodicidad de la encuesta no es válida.",
    )


def _normalize_survey_answers(questions: list, answers: dict) -> dict:
    if not isinstance(answers, dict):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Las respuestas no tienen un formato válido.",
        )

    normalized = {}
    question_ids = set()
    mapped_paths = set()
    for question in questions:
        question_id = question.get("id")
        field_path = question.get("mapsTo")
        question_type = question.get("type")
        if not isinstance(question_id, str) or not question_id or question_id in question_ids:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La plantilla contiene identificadores de pregunta inválidos.",
            )
        if field_path not in _SURVEY_FIELD_PATHS or field_path in mapped_paths:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La plantilla contiene indicadores inválidos o repetidos.",
            )
        if question_type not in {"scale", "choice", "text"}:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La plantilla contiene un tipo de pregunta no compatible.",
            )
        if (question_type == "text" and field_path != "openText") \
                or (question_type == "scale" and field_path in {"cognitiveLoad", "openText"}) \
                or (question_type == "choice" and field_path == "openText"):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="El tipo de pregunta no coincide con el indicador asignado.",
            )
        question_ids.add(question_id)
        mapped_paths.add(field_path)

        if question_id not in answers or answers[question_id] is None:
            if question.get("required", True):
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Completa todas las preguntas obligatorias.",
                )
            continue

        value = answers[question_id]
        if question.get("required", True) and value == "":
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Completa todas las preguntas obligatorias.",
            )
        if question_type == "scale":
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Una respuesta de escala no es válida.",
                )
            minimum, maximum = question.get("min"), question.get("max")
            if not isinstance(minimum, (int, float)) or not isinstance(maximum, (int, float)) \
                    or not minimum <= value <= maximum:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Una respuesta está fuera de la escala de la pregunta.",
                )
            if field_path.startswith("psychosocialFactors.") and minimum == 1 and maximum > 5:
                value = round(1 + ((value - minimum) / (maximum - minimum)) * 4, 1)
            if field_path in _SURVEY_NUMERIC_RANGES:
                lower, upper = _SURVEY_NUMERIC_RANGES[field_path]
                if not lower <= value <= upper:
                    raise https_fn.HttpsError(
                        code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                        message="Una respuesta no coincide con el rango del indicador.",
                    )
        elif question_type == "choice":
            options = question.get("options")
            option = next(
                (item for item in options or [] if str(item.get("value")) == str(value)),
                None,
            )
            if not option:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    message="Selecciona una opción válida.",
                )
            value = option["value"]
            if field_path in _SURVEY_NUMERIC_RANGES:
                try:
                    value = float(value)
                except (TypeError, ValueError) as error:
                    raise https_fn.HttpsError(
                        code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                        message="La plantilla define una opción numérica no válida.",
                    ) from error
                lower, upper = _SURVEY_NUMERIC_RANGES[field_path]
                if not lower <= value <= upper:
                    raise https_fn.HttpsError(
                        code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                        message="Una opción está fuera del rango del indicador.",
                    )
        elif not isinstance(value, str) or (field_path == "openText" and len(value) > 2000):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El comentario debe ser texto de hasta 2,000 caracteres.",
            )

        if field_path.startswith("psychosocialFactors."):
            normalized.setdefault("psychosocialFactors", {})[field_path.split(".", 1)[1]] = value
        else:
            normalized[field_path] = value

    if set(answers) - question_ids:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Se recibieron respuestas que no pertenecen a esta encuesta.",
        )
    normalized.setdefault("openText", "")
    return normalized


@https_fn.on_call(region="us-central1")
def submit_survey_response(req: https_fn.CallableRequest) -> dict:
    """Valida una respuesta autenticada y registra su ciclo sin vincularla al documento anónimo."""
    caller = _require_auth(req)
    data = req.data or {}
    if not isinstance(data, dict) or set(data) - {"departmentId", "answers", "templateId"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="La solicitud de encuesta contiene campos no permitidos.",
        )

    db = _db()
    profile = db.collection("users").document(caller.uid).get().to_dict() or {}
    role = profile.get("role")
    if profile.get("active", True) is False or role not in {"employee", "admin"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Tu cuenta no tiene permiso para responder encuestas.",
        )

    department_id = data.get("departmentId")
    if not isinstance(department_id, str) or not department_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Selecciona un departamento.",
        )
    if role != "admin" and department_id != profile.get("departmentId"):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo puedes responder para el departamento asignado a tu cuenta.",
        )
    department_snapshot = db.collection("departments").document(department_id).get()
    department = department_snapshot.to_dict() or {}
    if not department_snapshot.exists or not _is_active_record(department):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El departamento seleccionado no está disponible.",
        )

    template_id = data.get("templateId")
    if template_id is None:
        template_key = "default"
        questions = _DEFAULT_SURVEY_QUESTIONS
        cycle = "weekly"
    else:
        if not isinstance(template_id, str) or not template_id or "/" in template_id:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="La encuesta seleccionada no es válida.",
            )
        template_snapshot = db.collection("surveyTemplates").document(template_id).get()
        if not template_snapshot.exists:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.NOT_FOUND,
                message="La encuesta ya no está disponible.",
            )
        template = template_snapshot.to_dict() or {}
        if template.get("status") != "published":
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La encuesta ya no está publicada.",
            )
        targets = template.get("targetDepartments") or []
        if not isinstance(targets, list):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La asignación de departamentos de la encuesta no es válida.",
            )
        if role != "admin" and targets and department_id not in targets:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                message="Esta encuesta no está asignada a tu departamento.",
            )
        template_key = template_id
        questions = template.get("questions") or []
        if not isinstance(questions, list) or not questions:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="La encuesta no contiene preguntas válidas.",
            )
        cycle = template.get("cycle") or "weekly"

    normalized = _normalize_survey_answers(questions, data.get("answers"))
    local_now = datetime.now(_local_tz())
    week = local_now.date().isocalendar()
    week_id = f"{week.year}-W{week.week:02d}"
    cycle_id = _current_survey_cycle(cycle, local_now.date())
    completion_id = hashlib.sha256(
        f"{caller.uid}:{template_key}:{cycle_id}".encode("utf-8")
    ).hexdigest()
    completion_ref = db.collection("surveyCompletions").document(completion_id)
    response_ref = db.collection("responses").document()
    legacy_completion_ref = (
        db.collection("surveyCompletions").document(f"{caller.uid}_{template_id}_{cycle_id}")
        if template_id else None
    )
    response = {
        **normalized,
        "departmentId": department_id,
        "weekId": week_id,
        "submittedAt": admin_firestore.SERVER_TIMESTAMP,
        "source": "live",
        "instrumentVersion": _survey_instrument_version(normalized),
    }
    if template_id:
        response["templateId"] = template_id

    transaction = db.transaction()

    @admin_firestore.transactional
    def commit_response(transaction):
        completion_exists = next(transaction.get(completion_ref)).exists
        legacy_completion_exists = (
            next(transaction.get(legacy_completion_ref)).exists
            if legacy_completion_ref else False
        )
        if completion_exists or legacy_completion_exists:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
                message="Ya respondiste esta encuesta durante el periodo vigente.",
            )
        transaction.create(response_ref, response)
        transaction.create(completion_ref, {
            "userId": caller.uid,
            "templateId": template_key,
            "cycleId": cycle_id,
        })

    commit_response(transaction)
    return {"responseId": response_ref.id, "cycleId": cycle_id}


@https_fn.on_call(region="us-central1")
def submit_leave_request(req: https_fn.CallableRequest) -> dict:
    """Valida y registra una solicitud de permiso del usuario autenticado."""
    caller = _require_auth(req)
    db = _db()
    profile = db.collection("users").document(caller.uid).get().to_dict() or {}
    if not profile or profile.get("active", True) is False:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="No se encontró un perfil activo para tu cuenta.",
        )
    if profile.get("role") not in {"employee"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo un colaborador puede solicitar permisos.",
        )
    data = req.data or {}
    leave_type = data.get("type")
    start_value = data.get("startDate")
    end_value = data.get("endDate")
    reason = (data.get("reason") or "").strip()
    if leave_type not in {"annual", "sick", "other"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El tipo de permiso no es válido.",
        )
    if not isinstance(start_value, str) or not isinstance(end_value, str):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Selecciona el periodo de la solicitud.",
        )
    try:
        start_date = datetime.strptime(start_value, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_value, "%Y-%m-%d").date()
    except ValueError as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Las fechas deben tener el formato AAAA-MM-DD.",
        ) from e
    if start_date.isoformat() != start_value or end_date.isoformat() != end_value or start_date > end_date:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El periodo de la solicitud no es válido.",
        )
    if not reason or len(reason) > 500:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El motivo es obligatorio y no puede superar 500 caracteres.",
        )

    business_days = _count_business_days(start_date, end_date)
    if business_days <= 0 or business_days > 90:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El periodo debe incluir entre 1 y 90 días hábiles.",
        )

    existing = [
        item.to_dict() or {}
        for item in db.collection("leaveRequests").where("userId", "==", caller.uid).get()
    ]
    for request in existing:
        if request.get("status") not in {"pending", "approved"}:
            continue
        existing_start = request.get("startDate")
        existing_end = request.get("endDate")
        if not isinstance(existing_start, str) or not isinstance(existing_end, str):
            continue
        if start_value <= existing_end and end_value >= existing_start:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
                message="El periodo se traslapa con otra solicitud pendiente o aprobada.",
            )

    balance_at_request = None
    hire_date_value = profile.get("hireDate")
    if leave_type == "annual" and hire_date_value:
        try:
            hire_date = datetime.strptime(hire_date_value, "%Y-%m-%d").date()
        except (TypeError, ValueError) as e:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="RH debe corregir tu fecha de ingreso antes de calcular el saldo.",
            ) from e
        today = datetime.now(_local_tz()).date()
        years = _completed_years(hire_date, today)
        entitlement = _vacation_entitlement(years)
        if years == 0:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="Aún no tienes un saldo anual de vacaciones calculable.",
            )
        period_start = _anniversary(hire_date, hire_date.year + years)
        period_end = _anniversary(hire_date, hire_date.year + years + 1)
        period_last_day = period_end - timedelta(days=1)
        requested_balance_days = business_days
        reserved_days = 0
        for request in existing:
            if request.get("status") not in {"pending", "approved"} or request.get("type") not in {"annual", "vacation", "vacaciones"}:
                continue
            try:
                request_start = datetime.strptime(request.get("startDate", ""), "%Y-%m-%d").date()
                request_end = datetime.strptime(request.get("endDate", ""), "%Y-%m-%d").date()
            except ValueError:
                continue
            reserved_start = max(request_start, period_start)
            reserved_end = min(request_end, period_last_day)
            if reserved_start <= reserved_end:
                reserved_days += _count_business_days(reserved_start, reserved_end)

        balance_at_request = max(0, entitlement - reserved_days)
        if requested_balance_days > balance_at_request:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message=f"La solicitud excede el saldo disponible de {balance_at_request} días.",
            )

    leave_ref = db.collection("leaveRequests").document()
    leave_ref.set({
        "userId": caller.uid,
        "employeeId": profile.get("employeeId") or "",
        "employeeName": profile.get("displayName") or "",
        "departmentId": profile.get("departmentId"),
        "teamId": profile.get("teamId"),
        "type": leave_type,
        "startDate": start_value,
        "endDate": end_value,
        "businessDays": business_days,
        "reason": reason,
        "status": "pending",
        "balanceAtRequest": balance_at_request,
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    })
    return {"requestId": leave_ref.id, "businessDays": business_days}


@https_fn.on_call(region="us-central1")
def reset_user_password(req: https_fn.CallableRequest) -> dict:
    """Genera una contraseña temporal que el usuario deberá cambiar al entrar."""
    _require_admin(req)
    uid = (req.data or {}).get("uid")
    if not uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Falta el uid del usuario.",
        )

    temporary_password = _generate_temp_password()
    try:
        admin_auth.update_user(uid, password=temporary_password)
    except admin_auth.UserNotFoundError as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró la cuenta.",
        ) from e

    _db().collection("users").document(uid).set({"mustChangePassword": True}, merge=True)
    return {"temporaryPassword": temporary_password}


@https_fn.on_call(region="us-central1")
def delete_user_account(req: https_fn.CallableRequest) -> dict:
    """Elimina una cuenta de Auth y su perfil, respetando el último admin."""
    caller = _require_admin(req)
    uid = (req.data or {}).get("uid")
    if not uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Falta el uid del usuario.",
        )
    if uid == caller.uid:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="No puedes eliminar tu propia cuenta.",
        )

    db = _db()
    profile_ref = db.collection("users").document(uid)
    profile_snapshot = profile_ref.get()
    profile = profile_snapshot.to_dict() or {}

    try:
        auth_user = admin_auth.get_user(uid)
    except admin_auth.UserNotFoundError as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró la cuenta.",
        ) from e

    if (profile.get("role") or (auth_user.custom_claims or {}).get("role")) == "admin":
        admins = db.collection("users").where("role", "==", "admin").limit(2).get()
        if len(admins) <= 1:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                message="No puedes eliminar al último administrador.",
            )

    team_id = profile.get("teamId")
    if team_id:
        team_ref = db.collection("teams").document(team_id)
        team_ref.update({
            "memberIds": admin_firestore.ArrayRemove([uid]),
            f"memberNames.{uid}": admin_firestore.DELETE_FIELD,
        })
        assigned_tasks = team_ref.collection("tasks").where("assignedTo", "==", uid).get()
        for offset in range(0, len(assigned_tasks), 400):
            batch = db.batch()
            for task in assigned_tasks[offset:offset + 400]:
                batch.update(task.reference, {
                    "assignedTo": None,
                    "updatedAt": admin_firestore.SERVER_TIMESTAMP,
                })
            batch.commit()

    try:
        admin_auth.delete_user(uid)
    except admin_auth.UserNotFoundError as e:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró la cuenta de autenticación.",
        ) from e

    _record_departure(db, uid, profile, "deleted")
    db.collection("publicProfiles").document(uid).delete()
    profile_ref.delete()
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
    description = (data.get("description") or "").strip()
    department_id = data.get("departmentId")
    if not name or len(name) > 80:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El nombre del proyecto debe tener entre 1 y 80 caracteres.",
        )
    if len(description) > 2000:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="La descripción no puede superar 2000 caracteres.",
        )

    join_code = _generate_join_code()
    ref = _db().collection("teams").document()
    ref.set({
        "name": name,
        "description": description,
        "departmentId": department_id,
        "joinCode": join_code,
        "createdBy": caller.uid,
        "memberIds": [],
        "memberNames": {},
        "taskLists": [
            {"id": "todo", "label": "Por hacer"},
            {"id": "in_progress", "label": "En progreso"},
            {"id": "done", "label": "Hecho"},
        ],
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    })
    return {"teamId": ref.id, "joinCode": join_code}


@https_fn.on_call(region="us-central1")
def update_team_project(req: https_fn.CallableRequest) -> dict:
    """Permite editar nombre a admin y descripción a cualquier integrante."""
    data = req.data or {}
    _, _, team_ref, _, is_admin = _get_project_context(req)
    updates = {}

    if "name" in data:
        if not is_admin:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                message="Solo administración puede cambiar el nombre del proyecto.",
            )
        name = " ".join((data.get("name") or "").split())
        if not name or len(name) > 80:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El nombre debe tener entre 1 y 80 caracteres.",
            )
        updates["name"] = name

    if "description" in data:
        description = (data.get("description") or "").strip()
        if len(description) > 2000:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="La descripción no puede superar 2000 caracteres.",
            )
        updates["description"] = description

    if not updates:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="No hay cambios para guardar.",
        )
    team_ref.update(updates)
    return {"ok": True, **updates}


@https_fn.on_call(region="us-central1")
def delete_team_project(req: https_fn.CallableRequest) -> dict:
    """Elimina un proyecto y sus tareas, solo para administración."""
    _, db, team_ref, team, is_admin = _get_project_context(req)
    if not is_admin:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo administración puede eliminar proyectos.",
        )

    team_id = team_ref.id
    members = set(team.get("memberIds") or [])
    tasks = list(team_ref.collection("tasks").stream())
    for offset in range(0, len(tasks), 400):
        batch = db.batch()
        for task in tasks[offset:offset + 400]:
            batch.delete(task.reference)
        batch.commit()

    profiles = list(db.collection("users").where("teamId", "==", team_id).stream())
    members.update(profile.id for profile in profiles)
    for uid in members:
        profile_ref = db.collection("users").document(uid)
        profile = profile_ref.get().to_dict() or {}
        if profile.get("teamId") != team_id:
            continue
        other_teams = db.collection("teams").where(
            "memberIds", "array_contains", uid
        ).stream()
        next_team_id = next((item.id for item in other_teams if item.id != team_id), None)
        profile_ref.set({"teamId": next_team_id}, merge=True)

    team_ref.delete()
    return {"teamId": team_id, "ok": True}


@https_fn.on_call(region="us-central1")
def remove_team_member(req: https_fn.CallableRequest) -> dict:
    """Permite a administración retirar a una persona de un proyecto."""
    data = req.data or {}
    _, db, team_ref, team, is_admin = _get_project_context(req)
    if not is_admin:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo administración puede retirar integrantes.",
        )

    uid = (data.get("userId") or "").strip()
    if not uid or uid not in (team.get("memberIds") or []):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró a esa persona en el proyecto.",
        )
    _remove_member_and_reassign(db, team_ref, team_ref.id, uid)
    return {"teamId": team_ref.id, "userId": uid, "ok": True}


@https_fn.on_call(region="us-central1")
def leave_team_project(req: https_fn.CallableRequest) -> dict:
    """Permite a la persona autenticada abandonar un proyecto."""
    caller, db, team_ref, team, _ = _get_project_context(req)
    if caller.uid not in (team.get("memberIds") or []):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="No perteneces a este proyecto.",
        )
    _remove_member_and_reassign(db, team_ref, team_ref.id, caller.uid)
    return {"teamId": team_ref.id, "ok": True}


def _get_team_task_context(req: https_fn.CallableRequest) -> tuple:
    caller = _require_auth(req)
    data = req.data or {}
    team_id = (data.get("teamId") or "").strip()
    if not team_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El equipo es obligatorio.",
        )

    db = _db()
    team_ref = db.collection("teams").document(team_id)
    team_snapshot = team_ref.get()
    if not team_snapshot.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró el equipo.",
        )

    team = team_snapshot.to_dict() or {}
    is_admin = caller.token.get("role") == "admin"
    if not is_admin and caller.uid not in (team.get("memberIds") or []):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Solo los miembros del equipo pueden administrar listas.",
        )

    lists = team.get("taskLists") or [
        {"id": "todo", "label": "Por hacer"},
        {"id": "in_progress", "label": "En progreso"},
        {"id": "done", "label": "Hecho"},
    ]
    return caller, team_ref, lists


@https_fn.on_call(region="us-central1")
def create_team_task_list(req: https_fn.CallableRequest) -> dict:
    """Agrega una lista a un tablero si quien llama es admin o miembro del equipo."""
    data = req.data or {}
    _, team_ref, lists = _get_team_task_context(req)
    name = " ".join((data.get("name") or "").split())
    if not name:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El nombre de lista es obligatorio.",
        )

    if any((item.get("label") or "").casefold() == name.casefold() for item in lists):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
            message="Ya existe una lista con ese nombre.",
        )

    base_id = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-") or "lista"
    list_id = f"{base_id}-{secrets.token_hex(3)}"
    lists.append({"id": list_id, "label": name})
    team_ref.update({"taskLists": lists})
    return {"listId": list_id, "label": name}


@https_fn.on_call(region="us-central1")
def update_team_task_list(req: https_fn.CallableRequest) -> dict:
    """Renombra una lista del tablero sin cambiar su identificador."""
    data = req.data or {}
    _, team_ref, lists = _get_team_task_context(req)
    list_id = data.get("listId")
    name = " ".join((data.get("name") or "").split())
    if not list_id or not name:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Lista y nombre son obligatorios.",
        )

    target = next((item for item in lists if item.get("id") == list_id), None)
    if not target:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró la lista.",
        )
    if any(
        item.get("id") != list_id and (item.get("label") or "").casefold() == name.casefold()
        for item in lists
    ):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.ALREADY_EXISTS,
            message="Ya existe una lista con ese nombre.",
        )

    target["label"] = name
    team_ref.update({"taskLists": lists})
    return {"listId": list_id, "label": name}


@https_fn.on_call(region="us-central1")
def delete_team_task_list(req: https_fn.CallableRequest) -> dict:
    """Elimina una lista vacía, conservando al menos una columna en el tablero."""
    data = req.data or {}
    _, team_ref, lists = _get_team_task_context(req)
    list_id = data.get("listId")
    if not list_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="La lista es obligatoria.",
        )

    if not any(item.get("id") == list_id for item in lists):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="No se encontró la lista.",
        )
    if len(lists) <= 1:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="El tablero debe conservar al menos una lista.",
        )

    tasks = team_ref.collection("tasks").stream()
    if any(((task.to_dict() or {}).get("status") or "todo") == list_id for task in tasks):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            message="Mueve o elimina las tareas de esta lista antes de borrarla.",
        )

    team_ref.update({"taskLists": [item for item in lists if item.get("id") != list_id]})
    return {"listId": list_id, "ok": True}


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
    profile_data = profile_snap.to_dict() or {}
    display_name = profile_data.get("displayName") or auth.token.get("name") or ""
    _add_to_team(db, team.id, auth.uid, display_name)
    if not profile_data.get("teamId"):
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
    if now.date() in _mexican_public_holidays(now.year):
        return

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


@firestore_fn.on_document_created(
    document="activityLogs/{logId}",
    region="us-central1",
)
def publish_digital_attendance(event) -> None:
    """Marca en tiempo real la presencia si un movimiento ocurre dentro del horario."""
    snapshot = event.data
    if snapshot is None:
        return
    activity = snapshot.to_dict() or {}
    user_id = activity.get("userId")
    timestamp = activity.get("timestamp")
    if not user_id or not isinstance(timestamp, datetime):
        return

    local_tz = _local_tz()
    event_time = timestamp.replace(tzinfo=timezone.utc) if timestamp.tzinfo is None else timestamp
    local_event = event_time.astimezone(local_tz)
    date_str = local_event.strftime("%Y-%m-%d")
    if local_event.date() in _mexican_public_holidays(local_event.year):
        return

    db = _db()
    profile = db.collection("users").document(user_id).get().to_dict() or {}
    if not profile or profile.get("active", True) is False:
        return

    schedule = profile.get("workSchedule") or {}
    weekday_key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][local_event.weekday()]
    if weekday_key not in (schedule.get("days") or []):
        return
    try:
        start_parts = [int(part) for part in schedule.get("startTime", "09:00").split(":")]
        end_parts = [int(part) for part in schedule.get("endTime", "18:00").split(":")]
    except (TypeError, ValueError):
        return

    event_minutes = local_event.hour * 60 + local_event.minute
    start_minutes = start_parts[0] * 60 + start_parts[1]
    end_minutes = end_parts[0] * 60 + end_parts[1]
    if not start_minutes <= event_minutes <= end_minutes:
        return

    summary_ref = db.collection("presenceSummary").document(f"{user_id}_{date_str}")
    existing = summary_ref.get()
    if existing.exists and existing.get("present") is True:
        return
    summary_ref.set({
        "userId": user_id,
        "departmentId": profile.get("departmentId"),
        "teamId": profile.get("teamId"),
        "date": date_str,
        "present": True,
        "workDay": True,
        "computedAt": admin_firestore.SERVER_TIMESTAMP,
    }, merge=True)


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
    _require_admin(req)
    comments = (req.data or {}).get("comments", [])
    if not isinstance(comments, list):
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="La lista de comentarios no es válida.",
        )
    comments = comments[:120]
    if not comments:
        return {"results": []}

    db = _db()
    response_refs = {}
    for comment in comments:
        response_id = comment.get("id") if isinstance(comment, dict) else None
        if isinstance(response_id, str) and response_id.strip():
            response_refs.setdefault(response_id, db.collection("responses").document(response_id))

    response_snapshots = db.get_all(list(response_refs.values()))
    sentiments = {}
    pending = []
    for snapshot in response_snapshots:
        if not snapshot.exists:
            continue
        response_data = snapshot.to_dict() or {}
        text = response_data.get("openText")
        if not isinstance(text, str) or not text.strip():
            continue
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        cached_sentiment = response_data.get("sentiment")
        if (
            response_data.get("sentimentTextHash") == text_hash
            and cached_sentiment in {"positive", "neutral", "negative"}
        ):
            sentiments[snapshot.id] = cached_sentiment
        else:
            pending.append({
                "id": snapshot.id,
                "text": text,
                "text_hash": text_hash,
                "ref": snapshot.reference,
            })

    if not pending:
        return {
            "results": [
                {"id": response_id, "sentiment": sentiments[response_id]}
                for response_id in response_refs
                if response_id in sentiments
            ]
        }

    client = genai.Client(api_key=GEMINI_API_KEY.value)
    numbered = "\n".join(f"{i}: {comment['text']}" for i, comment in enumerate(pending))
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
        if not isinstance(classifications, list):
            raise ValueError("La respuesta del modelo no es una lista.")

        pending_sentiments = {}
        for c in classifications:
            if not isinstance(c, dict):
                continue
            idx = c.get("index")
            sentiment = c.get("sentiment")
            if (
                isinstance(idx, int)
                and not isinstance(idx, bool)
                and 0 <= idx < len(pending)
                and sentiment in {"positive", "neutral", "negative"}
            ):
                pending_sentiments[idx] = sentiment
        if len(pending_sentiments) != len(pending):
            raise ValueError("La respuesta del modelo no clasificó todos los comentarios.")

        cache_batch = db.batch()
        for idx, sentiment in pending_sentiments.items():
            comment = pending[idx]
            sentiments[comment["id"]] = sentiment
            cache_batch.set(comment["ref"], {
                "sentiment": sentiment,
                "sentimentTextHash": comment["text_hash"],
                "sentimentUpdatedAt": admin_firestore.SERVER_TIMESTAMP,
            }, merge=True)
        cache_batch.commit()
        return {
            "results": [
                {"id": response_id, "sentiment": sentiments[response_id]}
                for response_id in response_refs
                if response_id in sentiments
            ]
        }
    except Exception as e:
        # Los fallbacks no se guardan: un error temporal de Gemini no debe volverse un resultado persistente.
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"No se pudo clasificar o guardar el sentimiento: {str(e)[:120]}",
        ) from e