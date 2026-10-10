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
  currentColor = "#355c4b",
  priorColor = "#9b9a91",
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos disponibles.
      </div>
    );
  }

  return (
    <div className="h-full min-h-[10rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -15 }}>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
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
          <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "12px" }} />
          <Line
            name={currentLabel}
            type="monotone"
            dataKey={currentKey}
            stroke={currentColor}
            strokeWidth={3}
            dot={{ r: 3, fill: currentColor }}
            activeDot={{ r: 5 }}
          />
          {priorKey && (
            <Line
              name={priorLabel}
              type="monotone"
              dataKey={priorKey}
              stroke={priorColor}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
