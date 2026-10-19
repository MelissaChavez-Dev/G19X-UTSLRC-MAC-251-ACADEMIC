if __package__:
    from .common import admin_auth, admin_firestore, https_fn, re, _db, _require_admin, _require_auth, EMPLOYMENT_TYPES, _add_to_team, _ensure_employee_id_available, _generate_temp_password, _is_active_record, _normalize_hire_date, _record_departure, _remove_from_team
else:
    from common import admin_auth, admin_firestore, https_fn, re, _db, _require_admin, _require_auth, EMPLOYMENT_TYPES, _add_to_team, _ensure_employee_id_available, _generate_temp_password, _is_active_record, _normalize_hire_date, _record_departure, _remove_from_team

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
        {"value": "context-switching"}, {"value": "tool-delays"},
        {"value": "unclear-priorities"}, {"value": "no-friction"},
    ]},
    {"id": "psych_cognitive_load", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.cognitiveLoad", "required": True},
    {"id": "psych_role_ambiguity", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.roleAmbiguity", "required": True},
    {"id": "psych_emotional_labor", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.emotionalLabor", "required": True},
    {"id": "psych_shift_fatigue", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.shiftFatigue", "required": True},
    {"id": "psych_autonomy", "type": "scale", "min": 1, "max": 5, "mapsTo": "psychosocialFactors.autonomy", "required": True},
    {"id": "psychSafety", "type": "scale", "min": 1, "max": 10, "mapsTo": "psychosocialFactors.psychSafety", "required": True},
    {"id": "openText", "type": "text", "mapsTo": "openText", "required": False},
]

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
