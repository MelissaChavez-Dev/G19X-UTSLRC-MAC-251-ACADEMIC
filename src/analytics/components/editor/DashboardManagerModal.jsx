import { useState } from "react";

export default function DashboardManagerModal({
  isOpen = false,
  onClose,
  dashboards = [],
  activeDashboardId = null,
  onSelectDashboard,
  onCreateDashboard,
  onDuplicateDashboard,
  onRenameDashboard,
  onDeleteDashboard,
}) {
  const [newDashboardName, setNewDashboardName] = useState("");
  const [createFromTemplate, setCreateFromTemplate] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");

  if (!isOpen) return null;

  function handleCreate(e) {
    e.preventDefault();
    if (!newDashboardName.trim()) return;
    onCreateDashboard({
      name: newDashboardName.trim(),
      fromTemplate: createFromTemplate,
    });
    setNewDashboardName("");
  }

  function handleStartRename(dash) {
    setRenamingId(dash.id);
    setRenameText(dash.name);
  }

  function handleConfirmRename(dashId) {
    if (renameText.trim()) {
      onRenameDashboard(dashId, renameText.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-lowest shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-outline-variant/40 px-space-lg py-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">dashboard_customize</span>
            <h3 className="text-headline-sm font-bold text-on-surface">Gestión de Dashboards (Estilo Power BI)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-space-lg space-y-space-lg">
          {/* Create New Form */}
          <form onSubmit={handleCreate} className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-space-md flex flex-col gap-space-sm">
            <h4 className="text-label-md font-semibold text-on-surface">Crear Nuevo Dashboard</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del nuevo dashboard..."
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!newDashboardName.trim()}
                className="rounded-full bg-primary px-space-md py-1.5 text-label-sm font-semibold text-on-primary disabled:opacity-50"
              >
                Crear
              </button>
            </div>
            <label className="flex items-center gap-2 text-label-xs text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={createFromTemplate}
                onChange={(e) => setCreateFromTemplate(e.target.checked)}
                className="accent-primary"
              />
              Inicializar con las 14 plantillas del informe Power BI de referencia
            </label>
          </form>

          {/* List of Dashboards */}
          <div className="space-y-space-sm">
            <h4 className="text-label-md font-semibold text-on-surface">Mis Dashboards Guardados en Firestore</h4>

            {dashboards.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant py-space-sm">
                Aún no has guardado dashboards personalizados. Puedes crear uno nuevo arriba.
              </p>
            ) : (
              <div className="space-y-2">
                {dashboards.map((dash) => {
                  const isActive = dash.id === activeDashboardId;
                  const isRenaming = renamingId === dash.id;

                  return (
                    <div
                      key={dash.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-space-sm transition-colors ${
                        isActive
                          ? "border-primary bg-primary-container/20 shadow-xs"
                          : "border-outline-variant/50 bg-surface-container-lowest hover:bg-surface-container-low/40"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              className="rounded-md border border-outline-variant px-2 py-1 text-body-sm text-on-surface"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmRename(dash.id)}
                              className="text-label-xs font-semibold text-primary underline"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingId(null)}
                              className="text-label-xs text-on-surface-variant"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-body-sm text-on-surface truncate">
                              {dash.name}
                            </span>
                            {isActive && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                                Activo
                              </span>
                            )}
                            <span className="text-body-xs text-on-surface-variant">
                              · {dash.pages?.length || 0} páginas
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSelectDashboard(dash)}
                            className="rounded-lg border border-outline-variant px-2.5 py-1 text-label-xs text-on-surface hover:bg-surface-container"
                          >
                            Abrir
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartRename(dash)}
                          title="Renombrar"
                          className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateDashboard(dash)}
                          title="Duplicar dashboard"
                          className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar el dashboard "${dash.name}"?`)) {
                              onDeleteDashboard(dash.id);
                            }
                          }}
                          title="Eliminar dashboard"
                          className="rounded-full p-1 text-error hover:bg-error-container"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex justify-end border-t border-outline-variant/40 px-space-lg py-space-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-container-low px-space-md py-1.5 text-label-sm font-medium text-on-surface hover:bg-surface-container"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
