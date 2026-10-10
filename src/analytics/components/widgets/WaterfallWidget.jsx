import { useMemo } from "react";
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

function computeWaterfallStages(data) {
  let running = 0;
  return data.map((item) => {
    let base = 0;
    const val = item.count;

    if (item.isTotal) {
      base = 0;
      running = val;
    } else if (item.isIncrease) {
      base = running;
      running += val;
    } else if (item.isDecrease) {
      running += val; // val is negative
      base = running;
    }

    return {
      stage: item.stage,
      displayValue: val,
      absoluteVal: Math.abs(val),
      base,
      isTotal: item.isTotal,
      isIncrease: item.isIncrease,
      isDecrease: item.isDecrease,
    };
  });
}

/**
 * MoM Waterfall Chart for headcount flow:
 * Inicial -> Altas (+) -> Bajas (-) -> Final
 */
export default function WaterfallWidget({
  data = [], // [{ stage, count, isTotal, isIncrease, isDecrease }]
}) {
  const transformed = useMemo(() => computeWaterfallStages(data), [data]);

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
        <BarChart data={transformed} margin={{ top: 12, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage" tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--on-surface-variant)", fontSize: 11 }} />
          <Tooltip
            formatter={(value, name, props) => [
              props.payload.displayValue > 0
                ? `+${props.payload.displayValue}`
                : `${props.payload.displayValue}`,
              "Movimiento",
            ]}
            contentStyle={{
              backgroundColor: "var(--surface-container-lowest)",
              borderColor: "var(--outline-variant)",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
          />
          {/* Invisible spacer bar */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />
          {/* Visible delta or total bar */}
          <Bar dataKey="absoluteVal" stackId="waterfall" radius={[4, 4, 0, 0]}>
            {transformed.map((entry, index) => {
              let color = "#9b9a91";
              if (entry.isIncrease) color = "#4f8070";
              else if (entry.isDecrease) color = "#c77968";
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
