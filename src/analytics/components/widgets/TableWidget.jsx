import { useState, useMemo } from "react";

export default function TableWidget({
  data = [],
  columns = [], // [{ key, label, render }]
  pageSize = 10,
  searchPlaceholder = "Buscar...",
  compact = false,
  onRowClick,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const compare = valA > valB ? 1 : -1;
      return sortConfig.direction === "asc" ? compare : -compare;
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key) {
    setSortConfig((curr) => {
      if (curr.key === key) {
        return { key, direction: curr.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }

  return (
    <div className={`flex h-full min-h-0 w-full flex-col ${compact ? "gap-1 text-[10px]" : "gap-2 text-body-sm"}`}>
      {/* Search Input */}
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className={`max-w-xs rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface outline-none focus:border-primary ${
            compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-body-sm"
          }`}
        />
        <span className="text-label-sm text-on-surface-variant">
          Total: {sortedData.length.toLocaleString("es-MX")} registros
        </span>
      </div>

      {/* Table container */}
      <div className={`min-h-0 overflow-auto border border-[#dedede] bg-white ${compact ? "flex-1" : "overflow-x-auto"}`}>
        <table className={`min-w-full text-left ${compact ? "text-[10px]" : "text-body-sm"}`}>
          <thead className="bg-[#edc400] text-[11px] font-semibold text-[#292929]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none hover:text-on-surface ${compact ? "px-2 py-1" : "px-3 py-2.5"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className={`material-symbols-outlined ${compact ? "text-[11px]" : "text-[14px]"}`}>
                        {sortConfig.direction === "asc" ? "arrow_upward" : "arrow_downward"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={compact ? "px-2 py-3 text-center text-on-surface-variant" : "px-3 py-6 text-center text-on-surface-variant"}>
                  No hay registros que coincidan.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || row.employeeId || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-t border-[#e5e5e5] odd:bg-white even:bg-[#f4f4f4] hover:bg-[#fff6cb] ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`text-on-surface ${compact ? "px-2 py-1" : "px-3 py-2"}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-label-sm text-on-surface-variant pt-1">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-outline-variant px-2.5 py-1 hover:bg-surface-container disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-outline-variant px-2.5 py-1 hover:bg-surface-container disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
