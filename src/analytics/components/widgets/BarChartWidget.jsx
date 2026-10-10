import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

const DEFAULT_COLORS = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91"];

export default function BarChartWidget({
  data = [],
  layout = "horizontal", // "horizontal" or "vertical"
  categoryKey = "name",
  valueKey = "count",
  unit = "",
  compact = false,
  hideAxis = false,
  showValues = false,
  onItemClick,
  activeItem,
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center text-on-surface-variant ${compact ? "min-h-0 text-xs" : "min-h-48 text-body-sm"}`}>
        Sin datos para esta selección.
      </div>
    );
  }

  const isVertical = layout === "vertical";

  return (
    <div className={`h-full w-full ${compact ? "min-h-0" : "min-h-[10rem]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={compact
            ? { top: 2, right: 4, bottom: isVertical ? 0 : 8, left: isVertical ? 4 : -8 }
            : { top: 8, right: 12, bottom: isVertical ? 0 : 20, left: isVertical ? 20 : -15 }}
        >
          {!hideAxis && <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />}
          {isVertical ? (
            <>
              <XAxis hide={hideAxis} type="number" tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }} />
              <YAxis
                type="category"
                dataKey={categoryKey}
                width={compact ? 48 : 80}
                tick={{ fill: "var(--on-surface)", fontSize: compact ? 10 : 11 }}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                interval={0}
                angle={data.length > 5 ? -25 : 0}
                textAnchor={data.length > 5 ? "end" : "middle"}
                tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }}
              />
              <YAxis hide={hideAxis} tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }} />
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
            {showValues && (
              <LabelList
                dataKey={valueKey}
                position={isVertical ? "right" : "top"}
                formatter={(value) => Number(value).toLocaleString("es-MX")}
                style={{ fill: "var(--on-surface)", fontSize: compact ? 10 : 10 }}
              />
            )}
            {data.map((entry, index) => {
              const isSelected = activeItem === entry[categoryKey];
              const color = isSelected ? "#d1b65c" : compact ? "#edc400" : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              return <Cell key={`cell-${index}`} fill={color} opacity={activeItem && !isSelected ? 0.35 : 1} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
