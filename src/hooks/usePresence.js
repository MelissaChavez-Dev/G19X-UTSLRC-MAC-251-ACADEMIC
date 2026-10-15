import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";
import { isCoveredByApprovedLeave, isMexicanPublicHoliday } from "../utils/leaveUtils";

function cutoffDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

const WEEKDAY_KEYS = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };

function hermosilloParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Hermosillo",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    weekday: WEEKDAY_KEYS[values.weekday],
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function timeToMinutes(value, fallback) {
  const [hours, minutes] = (value || fallback).split(":").map(Number);
  return hours * 60 + minutes;
}

function isDuringWorkHours(timestamp, schedule, today) {
  const date = timestamp?.toDate?.();
  if (!date) return false;
  const eventTime = hermosilloParts(date);
  const days = schedule?.days || [];
  return eventTime.date === today.date
    && days.includes(today.weekday)
    && eventTime.minutes >= timeToMinutes(schedule?.startTime, "09:00")
    && eventTime.minutes <= timeToMinutes(schedule?.endTime, "18:00");
}

function summarizePresence(records, leaveRequests = []) {
  const cutoff = cutoffDate(30);
  const approvedLeaves = leaveRequests.filter((request) => request.status === "approved");
  const recentRecords = records.filter((record) =>
    record.date >= cutoff && record.workDay && !isMexicanPublicHoliday(record.date)
  );
  const workDays = recentRecords.length;
  const presentDays = recentRecords.filter((record) => record.present).length;
  const absentRecords = recentRecords.filter((record) => !record.present);
  const justifiedDays = absentRecords.filter((record) =>
    isCoveredByApprovedLeave(record.date, approvedLeaves)
  ).length;
  return {
    workDays,
    presentDays,
    justifiedDays,
    absentDays: absentRecords.length - justifiedDays,
  };
}

/**
 * Resumen de presencia digital del propio colaborador (transparencia):
 * cuántos de sus días laborales registró al menos un movimiento en la app.
 */
export function useMyPresence() {
  const { user, profile } = useAuth();
  const userId = user?.uid ?? null;
  const [state, setState] = useState({
    userId: null,
    summaryRecords: [],
    leaveRequests: [],
    leaveRequestsLoaded: false,
    events: [],
    loading: true,
    activityError: "",
    summaryError: "",
  });

  useEffect(() => {
    if (!userId) return undefined;

    const summaryQuery = query(collection(db, "presenceSummary"), where("userId", "==", userId));
    const leaveQuery = query(collection(db, "leaveRequests"), where("userId", "==", userId));
    const activityQuery = query(
      collection(db, "activityLogs"),
      where("userId", "==", userId)
    );

    const unsubscribeSummary = onSnapshot(
      summaryQuery,
      (snapshot) => {
        const summaryRecords = snapshot.docs.map((item) => item.data());
        setState((current) => ({ ...current, userId, summaryRecords, summaryError: "" }));
      },
      (error) => {
        console.error("No se pudo cargar el resumen de presencia digital:", error);
        setState((current) => ({
          ...current,
          userId,
          summaryError: "No se pudo cargar el resumen de presencia digital.",
        }));
      }
    );
    const unsubscribeLeaves = onSnapshot(
      leaveQuery,
      (snapshot) => {
        const leaveRequests = snapshot.docs.map((item) => item.data());
        setState((current) => ({
          ...current,
          userId,
          leaveRequests,
          leaveRequestsLoaded: true,
          activityError: "",
        }));
      },
      (error) => {
        console.error("No se pudieron cargar los permisos para el resumen de asistencia:", error);
        setState((current) => ({
          ...current,
          userId,
          leaveRequestsLoaded: true,
          activityError: "No se pudieron distinguir los permisos justificados.",
        }));
      }
    );
    const unsubscribeActivity = onSnapshot(
      activityQuery,
      (snapshot) => {
        const events = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((first, second) => (second.timestamp?.toMillis?.() || 0) - (first.timestamp?.toMillis?.() || 0))
          .slice(0, 50);
        setState((current) => ({ ...current, userId, events, loading: false, activityError: "" }));
      },
      (error) => {
        setState((current) => ({
          ...current,
          userId,
          loading: false,
          activityError: error.message || "No se pudo cargar tu historial de actividad.",
        }));
      }
    );

    return () => {
      unsubscribeSummary();
      unsubscribeLeaves();
      unsubscribeActivity();
    };
  }, [userId]);

  const currentState = state.userId === userId
    ? state
    : {
      summaryRecords: [],
      leaveRequests: [],
      leaveRequestsLoaded: false,
      events: [],
      loading: Boolean(userId),
      activityError: "",
      summaryError: "",
    };
  const summary = userId
    ? summarizePresence(currentState.summaryRecords, currentState.leaveRequests)
    : null;
  const today = hermosilloParts(new Date());
  const todayActivityCount = currentState.events.filter((event) =>
    isDuringWorkHours(event.timestamp, profile?.workSchedule || {}, today)
  ).length;

  return {
    ...currentState,
    summary,
    loading: currentState.loading || !currentState.leaveRequestsLoaded,
    todayActivityCount,
  };
}

/**
 * Indicador agregado de actividad digital registrada durante el horario,
 * no una medición de asistencia física.
 */
export function useAbsenceMetrics(departmentId = null, refreshKey = 0) {
  const [absence, setAbsence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [snapshot, leaveSnapshot] = await Promise.all([
          getDocs(collection(db, "presenceSummary")),
          getDocs(collection(db, "leaveRequests")),
        ]);
        const cutoff = cutoffDate(30);
        const records = snapshot.docs
          .map((d) => d.data())
          .filter(
            (r) =>
              r.date >= cutoff &&
              r.workDay &&
              !isMexicanPublicHoliday(r.date) &&
              (!departmentId || r.departmentId === departmentId)
          );

        const approvedLeavesByUser = new Map();
        leaveSnapshot.docs
          .map((item) => item.data())
          .filter((leave) => leave.status === "approved"
            && (!departmentId || leave.departmentId === departmentId))
          .forEach((leave) => {
            const requests = approvedLeavesByUser.get(leave.userId) || [];
            requests.push(leave);
            approvedLeavesByUser.set(leave.userId, requests);
          });
        const absentRecords = records.filter((record) => !record.present);
        const justifiedDays = absentRecords.filter((record) =>
          isCoveredByApprovedLeave(record.date, approvedLeavesByUser.get(record.userId) || [])
        ).length;
        const unjustifiedDays = absentRecords.length - justifiedDays;
        const workDays = records.length;
        const eligibleWorkDays = workDays - justifiedDays;
        setAbsence({
          workDays,
          absentDays: absentRecords.length,
          justifiedDays,
          unjustifiedDays,
          eligibleWorkDays,
          rate: eligibleWorkDays > 0 ? Math.round((unjustifiedDays / eligibleWorkDays) * 100) : null,
        });
      } catch (err) {
        console.error("No se pudo calcular la actividad digital no registrada:", err);
        setAbsence(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId, refreshKey]);

  return { absence, loading };
}
