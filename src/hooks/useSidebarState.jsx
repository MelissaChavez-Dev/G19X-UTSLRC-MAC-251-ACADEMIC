import { createContext, useContext, useEffect, useState, useCallback } from "react";

/* eslint-disable react-refresh/only-export-components */
const SidebarStateContext = createContext(null);

const STORAGE_KEY = "wellness-dashboard-sidebar-collapsed";

function getInitialCollapsed() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function SidebarStateProvider({ children }) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  return (
    <SidebarStateContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  const context = useContext(SidebarStateContext);
  if (!context) throw new Error("useSidebarState debe usarse dentro de <SidebarStateProvider>");
  return context;
}
