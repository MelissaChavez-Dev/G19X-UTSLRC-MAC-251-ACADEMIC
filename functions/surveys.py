if __package__:
    from .common import admin_firestore, https_fn, date, datetime, hashlib, math, options, _db, _require_auth, _local_tz, CURRENT_INSTRUMENT_VERSION, CURRENT_PSYCHOSOCIAL_FIELDS
else:
    from common import admin_firestore, https_fn, date, datetime, hashlib, math, options, _db, _require_auth, _local_tz, CURRENT_INSTRUMENT_VERSION, CURRENT_PSYCHOSOCIAL_FIELDS

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
