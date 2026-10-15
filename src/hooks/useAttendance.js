import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useLeaves } from "./useLeaves";
import { formatLocalDateInTimeZone } from "../utils/leaveUtils";

function rangeStart() {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return formatLocalDateInTimeZone(date);
}

export function useAttendance() {
  const { requests: leaveRequests, loading: leavesLoading, error: leavesError } = useLeaves();
  const [state, setState] = useState({
    employees: [],
    records: [],
    loading: true,
    error: null,
  });
  const startDate = rangeStart();

  useEffect(() => {
    let employeesLoaded = false;
    let recordsLoaded = false;
    let currentEmployees = [];
    let currentRecords = [];
    let currentError = null;

    function publish() {
      setState({
        employees: currentEmployees,
        records: currentRecords,
        loading: !employeesLoaded || !recordsLoaded,
        error: currentError,
      });
    }

    const employeeQuery = query(
      collection(db, "users"),
      where("active", "==", true)
    );
    const recordsQuery = query(
      collection(db, "presenceSummary"),
      where("date", ">=", startDate)
    );

    const unsubscribeEmployees = onSnapshot(
      employeeQuery,
      (snapshot) => {
        currentEmployees = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((employee) => employee.role === "employee")
          .sort((first, second) => (first.displayName || "").localeCompare(second.displayName || "", "es"));
        employeesLoaded = true;
        currentError = null;
        publish();
      },
      (error) => {
        currentError = error;
        employeesLoaded = true;
        publish();
      }
    );
    const unsubscribeRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        currentRecords = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        recordsLoaded = true;
        currentError = null;
        publish();
      },
      (error) => {
        currentError = error;
        recordsLoaded = true;
        publish();
      }
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeRecords();
    };
  }, [startDate]);

  return {
    ...state,
    leaveRequests,
    loading: state.loading || leavesLoading,
    error: state.error || leavesError,
  };
}
