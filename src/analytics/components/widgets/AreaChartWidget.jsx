import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AreaChartWidget({
  data = [],
  xKey = "label",
  valueKey = "value",
  unit = "",
  color = "#4f8070",
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-body-sm text-on-surface-variant">
        Sin datos disponibles.
      </div>
    );
  }

  const gradientId = `areaGradient_${color.replace("#", "")}`;

  return (
    <div className="h-full min-h-[10rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.45} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <Tooltip
            formatter={(val) => [`${Number(val).toLocaleString("es-MX", { maximumFractionDigits: 1 })} ${unit}`.trim(), "Valor"]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
