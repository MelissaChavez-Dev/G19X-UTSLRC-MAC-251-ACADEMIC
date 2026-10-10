import { useState } from "react";
import { motion } from "framer-motion";
import VisualizationsPanel from "./VisualizationsPanel";
import FieldsPanel from "./FieldsPanel";

export default function PowerBiEditorDrawer({
  isOpen = false,
  onClose,
  selectedWidget,
  onUpdateWidget,
  onAddWidget,
  onAddSlicer,
  onDeleteWidget,
  onDuplicateWidget,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  savingStatus = "saved", // "saved" | "saving" | "unsaved"
}) {
  const [activeTab, setActiveTab] = useState("visualizations"); // "visualizations" | "fields"

  if (!isOpen) return null;

  return (
    <motion.aside
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed right-0 top-16 bottom-0 z-40 flex w-[min(21rem,100vw)] flex-col border-l border-outline-variant/60 bg-surface-container-lowest shadow-lg select-none"
    >
      {/* Drawer Header with Title and Undo/Redo */}
      <header className="flex items-center justify-between border-b border-outline-variant/40 px-space-md py-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
          <span className="text-label-md font-bold text-on-surface">Editor Power BI</span>
        </div>

        {/* Undo/Redo & Save Status */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Deshacer (Ctrl+Z)"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title="Rehacer (Ctrl+Y)"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar panel de edición"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container ml-1"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </header>

      {/* Auto-save Status Strip */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-space-md py-1 text-[11px] text-on-surface-variant">
        <span>Autoguardado en Firestore</span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          <span className={`h-1.5 w-1.5 rounded-full ${savingStatus === "saving" ? "bg-warning animate-ping" : savingStatus === "error" ? "bg-error" : "bg-primary"}`} />
          {savingStatus === "saving" ? "Guardando..." : savingStatus === "error" ? "Error al guardar" : "Sincronizado"}
        </span>
      </div>

      {/* Action Buttons to Add Components */}
      <div className="flex gap-1.5 p-space-sm border-b border-outline-variant/30 bg-surface-container-lowest">
        <button
          type="button"
          onClick={() => onAddWidget?.("kpi")}
          className="flex-1 rounded-xl bg-primary-container px-2 py-1.5 text-label-xs font-semibold text-on-primary-container hover:bg-primary-container/80 flex items-center justify-center gap-1 shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">add_chart</span>
          + Widget
        </button>
        <button
          type="button"
          onClick={() => onAddSlicer?.()}
          className="flex-1 rounded-xl border border-outline-variant px-2 py-1.5 text-label-xs font-medium text-on-surface hover:bg-surface-container flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">filter_alt</span>
          + Slicer
        </button>
      </div>

      {/* Tab Switcher: Visualizaciones vs Campos */}
      <div className="flex border-b border-outline-variant/40 bg-surface-container-low">
        <button
          type="button"
          onClick={() => setActiveTab("visualizations")}
          className={`flex-1 py-2 text-label-sm font-medium transition-colors ${
            activeTab === "visualizations"
              ? "border-b-2 border-primary bg-surface-container-lowest font-bold text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Visualizaciones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("fields")}
          className={`flex-1 py-2 text-label-sm font-medium transition-colors ${
            activeTab === "fields"
              ? "border-b-2 border-primary bg-surface-container-lowest font-bold text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Campos y Medidas
        </button>
      </div>

      {/* Active Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "visualizations" ? (
          <VisualizationsPanel
            selectedWidget={selectedWidget}
            onUpdateWidget={onUpdateWidget}
          />
        ) : (
          <FieldsPanel
            selectedWidget={selectedWidget}
            onUpdateWidget={onUpdateWidget}
          />
        )}
      </div>

      {/* Footer Widget Quick Actions (if a widget is selected) */}
      {selectedWidget && (
        <footer className="flex items-center justify-between border-t border-outline-variant/40 bg-surface-container-low p-space-sm">
          <button
            type="button"
            onClick={() => onDuplicateWidget?.(selectedWidget)}
            className="flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1 text-label-xs font-medium text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            Duplicar
          </button>
          <button
            type="button"
            onClick={() => onDeleteWidget?.(selectedWidget.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-label-xs font-medium text-error hover:bg-error-container"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            Eliminar
          </button>
        </footer>
      )}
    </motion.aside>
  );
}
