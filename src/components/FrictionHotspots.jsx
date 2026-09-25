export default function FrictionHotspots({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
        <h2 className="text-headline-md text-on-surface tracking-tight mb-1">Focos de Fricción</h2>
        <p className="text-body-sm text-on-surface-variant">
          No se detectaron comentarios negativos recientes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
      <div className="flex items-center justify-between mb-space-md">
        <h2 className="text-headline-md text-on-surface tracking-tight">Focos de Fricción</h2>
        <span className="text-label-sm bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-semibold">
          {items.length} activos
        </span>
      </div>
      <div className="flex flex-col gap-space-sm">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
            <span className="w-1.5 h-1.5 rounded-full bg-error mt-2 flex-shrink-0" />
            <div>
              <span className="text-body-sm font-semibold text-on-surface block">{item.departmentName}</span>
              <p className="text-body-sm text-on-surface-variant">{item.excerpt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}