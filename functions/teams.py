if __package__:
    from .common import admin_firestore, https_fn, re, secrets, _db, _require_auth, _require_admin, _add_to_team, _generate_join_code, _get_project_context, _remove_member_and_reassign
else:
    from common import admin_firestore, https_fn, re, secrets, _db, _require_auth, _require_admin, _add_to_team, _generate_join_code, _get_project_context, _remove_member_and_reassign

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
