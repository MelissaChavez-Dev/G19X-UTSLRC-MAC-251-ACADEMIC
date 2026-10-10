import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ComboChartWidget({
  data = [],
  xKey = "name",
  barKey = "count",
  barLabel = "Dotación",
  lineKey = "rate",
  lineLabel = "Tasa (%)",
  barColor = "#355c4b",
  lineColor = "#d1b65c",
  barUnit = "",
  lineUnit = "%",
  compact = false,
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center text-on-surface-variant ${compact ? "min-h-0 text-xs" : "min-h-48 text-body-sm"}`}>
        Sin datos disponibles.
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${compact ? "min-h-0" : "min-h-[10rem]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={compact ? { top: 2, right: 4, bottom: 8, left: -6 } : { top: 8, right: 16, bottom: 20, left: -10 }}>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            angle={data.length > 5 ? -25 : 0}
            textAnchor={data.length > 5 ? "end" : "middle"}
            interval={0}
            tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }}
          />
          {/* Primary Y Axis for Bars */}
          <YAxis
            yAxisId="left"
            tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }}
            tickFormatter={(val) => Number(val).toLocaleString("es-MX")}
          />
          {/* Secondary Y Axis for Line */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: lineColor, fontSize: compact ? 10 : 11 }}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip
            formatter={(value, name) => [
              name === lineLabel
                ? `${Number(value).toFixed(1)} ${lineUnit}`.trim()
                : `${Number(value).toLocaleString("es-MX")} ${barUnit}`.trim(),
              name,
            ]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          <Legend verticalAlign="top" height={compact ? 18 : 32} wrapperStyle={{ fontSize: compact ? "10px" : "12px" }} />
          <Bar
            yAxisId="left"
            name={barLabel}
            dataKey={barKey}
            fill={barColor}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            name={lineLabel}
            type="monotone"
            dataKey={lineKey}
            stroke={lineColor}
            strokeWidth={compact ? 2 : 3}
            dot={{ r: compact ? 1 : 4, fill: lineColor }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
