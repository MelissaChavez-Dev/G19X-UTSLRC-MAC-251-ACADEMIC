import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PALETTE = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91", "#b5a98b"];

export default function DonutWidget({
  data = [],
  nameKey = "name",
  valueKey = "count",
  unit = "",
  onItemClick,
  activeItem,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos disponibles.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);

  return (
    <div className="relative h-full min-h-[10rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={valueKey}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            cursor={onItemClick ? "pointer" : "default"}
            onClick={(entry) => onItemClick?.(entry[nameKey])}
          >
            {data.map((entry, index) => {
              const isSelected = activeItem === entry[nameKey];
              const color = isSelected
                ? "#d1b65c"
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
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: "11px" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center -translate-y-4">
        <span className="text-body-xs text-on-surface-variant">Total</span>
        <span className="text-title-md font-bold text-on-surface">
          {total.toLocaleString("es-MX")}
        </span>
      </div>
    </div>
  );
}
