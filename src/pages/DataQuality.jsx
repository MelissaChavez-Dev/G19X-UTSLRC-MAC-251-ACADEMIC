import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import DataQualityView from "../components/DataQualityView";
import { useDataQuality } from "../hooks/useDataQuality";
import { useSidebarState } from "../hooks/useSidebarState";

/** Página /admin/calidad: guía y estado de la calidad de los datos (solo administración). */
export default function DataQuality() {
  const { collapsed } = useSidebarState();
  const quality = useDataQuality();

  return (
    <div className="app-canvas zone-dashboard min-h-screen">
      <Sidebar />
      <TopBar />
      <main className={`${collapsed ? "pl-20" : "pl-64"} pt-16 relative z-10 transition-[padding] duration-300 ease-out`}>
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-space-lg px-space-xl py-space-lg">
          <DataQualityView {...quality} />
        </div>
      </main>
    </div>
  );
}
