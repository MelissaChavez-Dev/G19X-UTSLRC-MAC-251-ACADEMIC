import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

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

function summarizePresence(records) {
  const cutoff = cutoffDate(30);
  const recentRecords = records.filter((record) => record.date >= cutoff && record.workDay);
  const workDays = recentRecords.length;
  const presentDays = recentRecords.filter((record) => record.present).length;
  return { workDays, presentDays, absentDays: workDays - presentDays };
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
    summary: null,
    events: [],
    loading: true,
    activityError: "",
  });

  useEffect(() => {
    if (!userId) return undefined;

    const summaryQuery = query(collection(db, "presenceSummary"), where("userId", "==", userId));
    const activityQuery = query(
      collection(db, "activityLogs"),
      where("userId", "==", userId)
    );

    const unsubscribeSummary = onSnapshot(summaryQuery, (snapshot) => {
      const summary = summarizePresence(snapshot.docs.map((item) => item.data()));
      setState((current) => ({ ...current, userId, summary }));
    });
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
      unsubscribeActivity();
    };
  }, [userId]);

  const currentState = state.userId === userId
    ? state
    : { summary: null, events: [], loading: Boolean(userId), activityError: "" };
  const today = hermosilloParts(new Date());
  const todayActivityCount = currentState.events.filter((event) =>
    isDuringWorkHours(event.timestamp, profile?.workSchedule || {}, today)
  ).length;

  return { ...currentState, todayActivityCount };
}

/**
 * Ausentismo digital agregado (solo admin): días sin ningún movimiento
 * dentro del horario laboral / días laborales esperados, últimos 30 días.
 */
export function useAbsenceMetrics(departmentId = null) {
  const [absence, setAbsence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "presenceSummary"));
        const cutoff = cutoffDate(30);
        const records = snapshot.docs
          .map((d) => d.data())
          .filter(
            (r) =>
              r.date >= cutoff &&
              r.workDay &&
              (!departmentId || r.departmentId === departmentId)
          );

        const workDays = records.length;
        const absentDays = records.filter((r) => !r.present).length;
        setAbsence({
          workDays,
          absentDays,
          rate: workDays > 0 ? Math.round((absentDays / workDays) * 100) : 0,
        });
      } catch (err) {
        console.error("No se pudo calcular el ausentismo digital:", err);
        setAbsence(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [departmentId]);

  return { absence, loading };
}
