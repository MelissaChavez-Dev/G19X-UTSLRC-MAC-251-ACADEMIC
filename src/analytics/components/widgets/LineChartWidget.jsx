import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function LineChartWidget({
  data = [],
  xKey = "label",
  currentKey = "value",
  currentLabel = "Actual",
  priorKey = null,
  priorLabel = "Año anterior (LY)",
  unit = "",
  compact = false,
  currentColor = "#355c4b",
  priorColor = "#9b9a91",
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
        <LineChart data={data} margin={compact ? { top: 2, right: 4, bottom: 0, left: -8 } : { top: 8, right: 16, bottom: 0, left: -15 }}>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }} />
          <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: compact ? 10 : 11 }} />
          <Tooltip
            formatter={(val, name) => [
              `${Number(val).toLocaleString("es-MX", { maximumFractionDigits: 1 })} ${unit}`.trim(),
              name,
            ]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          <Legend verticalAlign="top" height={compact ? 18 : 30} wrapperStyle={{ fontSize: compact ? "10px" : "12px" }} />
          <Line
            name={currentLabel}
            type="monotone"
            dataKey={currentKey}
            stroke={currentColor}
            strokeWidth={compact ? 2 : 3}
            dot={{ r: compact ? 1 : 3, fill: currentColor }}
            activeDot={{ r: compact ? 3 : 5 }}
          />
          {priorKey && (
            <Line
              name={priorLabel}
              type="monotone"
              dataKey={priorKey}
              stroke={priorColor}
              strokeWidth={compact ? 1.5 : 2}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
