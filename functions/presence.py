if __package__:
    from .common import admin_firestore, datetime, dt_time, firestore_fn, scheduler_fn, timezone, _db, _is_active_record, _local_tz, _mexican_public_holidays
else:
    from common import admin_firestore, datetime, dt_time, firestore_fn, scheduler_fn, timezone, _db, _is_active_record, _local_tz, _mexican_public_holidays

DEFAULT_WORK_DAYS = ("mon", "tue", "wed", "thu", "fri")


def _scheduled_days(schedule):
    days = schedule.get("days")
    if days is None:
        return DEFAULT_WORK_DAYS
    return days if isinstance(days, (list, tuple, set)) else ()


def _work_schedule_bounds(schedule):
    try:
        start_parts = [int(part) for part in (schedule.get("startTime") or "09:00").split(":")]
        end_parts = [int(part) for part in (schedule.get("endTime") or "18:00").split(":")]
        if len(start_parts) != 2 or len(end_parts) != 2:
            return None
        start = dt_time(*start_parts)
        end = dt_time(*end_parts)
    except (TypeError, ValueError):
        return None
    return (start, end) if start < end else None

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

    for user_doc in db.collection("users").stream():
        profile = user_doc.to_dict() or {}
        if profile.get("role") != "employee" or not _is_active_record(profile):
            continue
        schedule = profile.get("workSchedule") or {}
        days = _scheduled_days(schedule)
        if today_key not in days:
            continue

        bounds = _work_schedule_bounds(schedule)
        if not bounds:
            continue

        window_start = datetime.combine(now.date(), bounds[0], tzinfo=local_tz)
        window_end = datetime.combine(now.date(), bounds[1], tzinfo=local_tz)

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
    if (
        not profile
        or profile.get("role") != "employee"
        or not _is_active_record(profile)
    ):
        return

    schedule = profile.get("workSchedule") or {}
    weekday_key = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][local_event.weekday()]
    if weekday_key not in _scheduled_days(schedule):
        return
    bounds = _work_schedule_bounds(schedule)
    if not bounds:
        return

    event_minutes = local_event.hour * 60 + local_event.minute
    start_minutes = bounds[0].hour * 60 + bounds[0].minute
    end_minutes = bounds[1].hour * 60 + bounds[1].minute
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
