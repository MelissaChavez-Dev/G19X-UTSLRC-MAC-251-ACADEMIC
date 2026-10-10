import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PALETTE = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91", "#b5a98b"];
const COMPACT_PALETTE = ["#edc400", "#a6a6a6", "#d7b31a", "#c8c8c8", "#8f8f8f"];

export default function DonutWidget({
  data = [],
  nameKey = "name",
  valueKey = "count",
  unit = "",
  onItemClick,
  activeItem,
  compact = false,
  labelMode,
  showValues = false,
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center text-on-surface-variant ${compact ? "min-h-0 text-xs" : "min-h-48 text-body-sm"}`}>
        Sin datos disponibles.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);

  return (
    <div className={`relative h-full w-full ${compact ? "min-h-0" : "min-h-[10rem]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={valueKey}
            innerRadius={compact ? "32%" : 55}
            outerRadius={compact ? "50%" : 80}
            paddingAngle={compact ? 1 : 2}
            label={labelMode === "outside"
              ? (entry) => showValues
                ? `${entry.name} ${Number(entry.value).toLocaleString("es-MX")}`
                : entry.name
              : false}
            labelLine={labelMode === "outside"}
            cursor={onItemClick ? "pointer" : "default"}
            onClick={(entry) => onItemClick?.(entry[nameKey])}
          >
            {data.map((entry, index) => {
              const isSelected = activeItem === entry[nameKey];
              const color = isSelected
                ? "#d1b65c"
                : compact
                  ? COMPACT_PALETTE[index % COMPACT_PALETTE.length]
                  : PALETTE[index % PALETTE.length];
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  opacity={activeItem && !isSelected ? 0.35 : 1}
                />
              );
            })}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const val = Number(value);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return [`${val.toLocaleString("es-MX")} ${unit} (${pct}%)`.trim(), name];
            }}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          {labelMode !== "outside" && (
            <Legend
              verticalAlign="bottom"
              height={compact ? 18 : 36}
              wrapperStyle={{ fontSize: compact ? "10px" : "11px" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${compact ? "" : "-translate-y-4"}`}>
        <span className={compact ? "text-[10px] text-on-surface-variant" : "text-body-xs text-on-surface-variant"}>Total</span>
        <span className={`font-bold text-on-surface ${compact ? "text-sm" : "text-title-md"}`}>
          {total.toLocaleString("es-MX")}
        </span>
      </div>
    </div>
  );
}
