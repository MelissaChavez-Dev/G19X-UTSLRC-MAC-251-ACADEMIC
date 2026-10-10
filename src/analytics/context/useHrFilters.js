import { useContext } from "react";
import { HrFilterContext } from "./HrFilterContext";

export function useHrFilters() {
  const context = useContext(HrFilterContext);
  if (!context) {
    throw new Error("useHrFilters must be used within an HrFilterProvider");
  }
  return context;
}
