import firebase_admin
firebase_admin.initialize_app()
from firebase_functions import firestore_fn, https_fn, options, scheduler_fn
from firebase_admin import auth as admin_auth
from firebase_admin import firestore as admin_firestore
from firebase_admin import storage as admin_storage
from google.api_core.exceptions import GoogleAPIError
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from datetime import date, datetime, time as dt_time, timedelta, timezone
import secrets
import string
import re
import hashlib
import math

if __package__:
    from .shared import _db, _require_admin, _require_auth
else:
    from shared import _db, _require_admin, _require_auth

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

MAX_LEAVE_DOCUMENT_SIZE = 10 * 1024 * 1024

LEAVE_DOCUMENT_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}

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

def _is_active_record(data: dict) -> bool:
    return data.get("active", True) is not False

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
