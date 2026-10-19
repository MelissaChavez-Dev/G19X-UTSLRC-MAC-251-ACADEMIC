if __package__:
    from .common import admin_auth, admin_firestore, admin_storage, datetime, GoogleAPIError, https_fn, re, timedelta, _db, _require_auth, _local_tz, _anniversary, _completed_years, _count_business_days, _vacation_entitlement, MAX_LEAVE_DOCUMENT_SIZE, LEAVE_DOCUMENT_CONTENT_TYPES
else:
    from common import admin_auth, admin_firestore, admin_storage, datetime, GoogleAPIError, https_fn, re, timedelta, _db, _require_auth, _local_tz, _anniversary, _completed_years, _count_business_days, _vacation_entitlement, MAX_LEAVE_DOCUMENT_SIZE, LEAVE_DOCUMENT_CONTENT_TYPES

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
    document_path = data.get("documentPath")
    if leave_type not in {"annual", "sick", "other"}:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El tipo de permiso no es válido.",
        )
    proof_blob = None
    if leave_type == "sick":
        staging_prefix = f"leave-documents/{caller.uid}/pending/"
        file_id = document_path[len(staging_prefix):] if isinstance(document_path, str) and document_path.startswith(staging_prefix) else ""
        if not re.fullmatch(r"[0-9a-f-]{36}", file_id):
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="Adjunta el comprobante médico para la solicitud de incapacidad.",
            )
        proof_bucket = admin_storage.bucket()
        proof_blob = proof_bucket.get_blob(document_path)
        if not proof_blob:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="No se encontró el comprobante médico. Vuelve a adjuntarlo.",
            )
        if not 0 < (proof_blob.size or 0) <= MAX_LEAVE_DOCUMENT_SIZE \
                or proof_blob.content_type not in LEAVE_DOCUMENT_CONTENT_TYPES:
            raise https_fn.HttpsError(
                code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                message="El comprobante debe ser un PDF, JPG o PNG de hasta 10 MB.",
            )
    elif document_path:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="El comprobante solo se admite en solicitudes de incapacidad.",
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
    saved_document_path = None
    if proof_blob:
        saved_document_path = f"leave-documents/{caller.uid}/{leave_ref.id}"
        proof_bucket.copy_blob(proof_blob, proof_bucket, new_name=saved_document_path)

    leave_data = {
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
    }
    if saved_document_path:
        leave_data["documentPath"] = saved_document_path
    leave_ref.set(leave_data)
    if proof_blob:
        try:
            proof_blob.delete()
        except GoogleAPIError as cleanup_error:
            print(f"No se pudo eliminar el comprobante temporal {document_path}: {cleanup_error}")
    return {"requestId": leave_ref.id, "businessDays": business_days}
