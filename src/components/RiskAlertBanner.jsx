export default function RiskAlertBanner({ rows }) {
  const critical = rows.find((r) => r.tier.tone === "critical");
  if (!critical) return null;

  return (
    <div className="bg-surface-container p-space-md rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm mt-space-md">
      <div className="flex items-center gap-space-sm">
        <div className="p-2 rounded-md bg-error text-on-error flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">warning</span>
        </div>
        <div>
          <span className="text-headline-sm text-on-surface block">
            Alerta: {critical.name} en nivel crítico
          </span>
          <p className="text-body-sm text-on-surface-variant">
            La combinación de carga emocional y fatiga en este equipo supera el umbral de atención inmediata.
          </p>
        </div>
      </div>
    </div>
  );
}