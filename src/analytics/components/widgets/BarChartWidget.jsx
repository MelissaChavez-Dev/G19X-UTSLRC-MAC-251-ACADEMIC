import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const DEFAULT_COLORS = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91"];

export default function BarChartWidget({
  data = [],
  layout = "horizontal", // "horizontal" or "vertical"
  categoryKey = "name",
  valueKey = "count",
  unit = "",
  onItemClick,
  activeItem,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos para esta selección.
      </div>
    );
  }

  const isVertical = layout === "vertical";

  return (
    <div className="h-full min-h-[10rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, bottom: isVertical ? 0 : 20, left: isVertical ? 20 : -15 }}
        >
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          {isVertical ? (
            <>
              <XAxis type="number" tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey={categoryKey}
                width={80}
                tick={{ fill: "var(--on-surface)", fontSize: 11 }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? "end" : "middle"}
                tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
            </>
          )}
          <Tooltip
            formatter={(val) => [`${Number(val).toLocaleString("es-MX")} ${unit}`.trim(), "Valor"]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          <Bar
            dataKey={valueKey}
            radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            onClick={(entry) => onItemClick?.(entry[categoryKey])}
            cursor={onItemClick ? "pointer" : "default"}
          >
            {data.map((entry, index) => {
              const isSelected = activeItem === entry[categoryKey];
              const color = isSelected
                ? "#d1b65c"
                : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              return <Cell key={`cell-${index}`} fill={color} opacity={activeItem && !isSelected ? 0.35 : 1} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
