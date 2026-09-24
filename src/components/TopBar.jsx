export default function TopBar() {
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-sm z-40 flex items-center justify-between px-space-xl">
      <div className="flex items-center gap-space-sm bg-surface-container-low rounded-lg px-space-md py-1.5 w-96">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          type="text"
          placeholder="Buscar métricas, equipos, encuestas..."
          className="w-full bg-transparent border-none outline-none text-body-sm text-on-surface placeholder:text-on-surface-variant"
        />
      </div>
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs bg-surface-container-low px-space-sm py-1.5 rounded-lg text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          <span className="text-label-md text-on-surface">Últimos 30 días</span>
        </div>
      </div>
    </header>
  );
}