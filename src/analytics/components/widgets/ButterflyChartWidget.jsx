import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * Butterfly / Tornado bilateral chart.
 * Left series is inverted visually for comparative analysis (e.g. Female vs Male).
 */
export default function ButterflyChartWidget({
  data = [],
  categoryKey = "name",
  leftKey = "Female",
  rightKey = "Male",
  leftLabel = "Femenino",
  rightLabel = "Masculino",
  leftColor = "#74846a",
  rightColor = "#355c4b",
  onItemClick,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos disponibles.
      </div>
    );
  }

  // Pre-process left values to negative for bilateral mirroring
  const transformedData = data.map((d) => ({
    ...d,
    leftNegative: -(Number(d[leftKey]) || 0),
    rightPositive: Number(d[rightKey]) || 0,
  }));

  const maxVal = Math.max(
    ...data.flatMap((d) => [Number(d[leftKey]) || 0, Number(d[rightKey]) || 0]),
    10
  );

  return (
    <div className="h-full min-h-[10rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={transformedData}
          stackOffset="sign"
          margin={{ top: 8, right: 24, bottom: 0, left: 24 }}
        >
          <XAxis
            type="number"
            domain={[-maxVal, maxVal]}
            tickFormatter={(val) => Math.abs(val)}
            tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={110}
            tick={{ fill: "var(--on-surface)", fontSize: 11 }}
          />
          <Tooltip
            formatter={(val, name) => [
              Math.abs(Number(val)).toLocaleString("es-MX"),
              name === leftLabel ? leftLabel : rightLabel,
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
            height={32}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Bar
            name={leftLabel}
            dataKey="leftNegative"
            fill={leftColor}
            radius={[4, 0, 0, 4]}
            cursor={onItemClick ? "pointer" : "default"}
            onClick={(entry) => onItemClick?.(entry[categoryKey])}
          />
          <Bar
            name={rightLabel}
            dataKey="rightPositive"
            fill={rightColor}
            radius={[0, 4, 4, 0]}
            cursor={onItemClick ? "pointer" : "default"}
            onClick={(entry) => onItemClick?.(entry[categoryKey])}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
