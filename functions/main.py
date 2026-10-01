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
import re

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
    for field in ("displayName", "email", "departmentId", "teamId", "workSchedule"):
        if field in data:
            updates[field] = data[field]

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
    if role in ("employee", "team_lead", "admin"):
        updates["role"] = role
        admin_auth.set_custom_user_claims(uid, {"role": role})

    db = _db()
    user_ref = db.collection("users").document(uid)
    current_data = user_ref.get().to_dict() or {}
    old_team = current_data.get("teamId")
    removed_from_team_for_department = False

    if "departmentId" in updates and "teamId" not in data and old_team:
        old_team_snapshot = db.collection("teams").document(old_team).get()
        if old_team_snapshot.exists and old_team_snapshot.get("departmentId") != updates["departmentId"]:
            _remove_from_team(db, old_team, uid)
            updates["teamId"] = None
            removed_from_team_for_department = True

    if updates:
        user_ref.set(updates, merge=True)

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