import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PALETTE = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91"];

export default function StackedBarWidget({
  data = [],
  categoryKey = "name",
  seriesKeys = [], // e.g. ["Regular", "Contract"] or ["Female", "Male"]
  isPercent = false,
  unit = "",
  compact = false,
  onItemClick,
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center text-on-surface-variant ${compact ? "min-h-0 text-xs" : "min-h-48 text-body-sm"}`}>
        Sin datos disponibles.
      </div>
    );
  }

  // If seriesKeys not provided, infer from data object keys excluding categoryKey
  const keys = seriesKeys.length > 0
    ? seriesKeys
    : Object.keys(data[0] || {}).filter((k) => k !== categoryKey && k !== "total");

  return (
    <div className={`h-full w-full ${compact ? "min-h-0" : "min-h-[10rem]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          stackOffset={isPercent ? "expand" : "none"}
          margin={compact ? { top: 2, right: 4, bottom: 8, left: -6 } : { top: 8, right: 12, bottom: 20, left: -10 }}
        >
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={categoryKey}
            interval={0}
            angle={data.length > 5 ? -25 : 0}
            textAnchor={data.length > 5 ? "end" : "middle"}
            tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }}
          />
          <YAxis
            tickFormatter={(val) => (isPercent ? `${Math.round(val * 100)}%` : val)}
            tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }}
          />
          <Tooltip
            formatter={(value, name) => [
              isPercent
                ? `${(Number(value) * 100).toFixed(1)}%`
                : `${Number(value).toLocaleString("es-MX")} ${unit}`.trim(),
              name,
            ]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={compact ? 16 : 32}
            wrapperStyle={{ fontSize: compact ? "10px" : "12px" }}
          />
          {keys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={PALETTE[idx % PALETTE.length]}
              radius={idx === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              cursor={onItemClick ? "pointer" : "default"}
              onClick={(entry) => onItemClick?.(entry[categoryKey])}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
