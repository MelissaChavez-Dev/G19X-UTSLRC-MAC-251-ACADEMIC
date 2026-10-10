export default function GaugeWidget({
  value = 0,
  target = 50,
  min = 0,
  max = 100,
  title = "",
  unit = "%",
  color = "#4f8070",
  compact = false,
}) {
  const safeVal = Math.max(min, Math.min(max, Number(value) || 0));
  const pct = (safeVal - min) / (max - min);

  // SVG parameters for semicircle gauge
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className={`flex h-full flex-col items-center justify-center text-center ${compact ? "p-0.5" : "p-2"}`}>
      {title && <span className={`text-on-surface-variant ${compact ? "mb-0 text-[9px]" : "mb-1 text-label-sm"}`}>{title}</span>}

      <div className="relative flex items-center justify-center">
        <svg width={compact ? "140" : "180"} height={compact ? "82" : "105"} viewBox="0 0 180 105">
          {/* Background track */}
          <path
            d="M 15 95 A 70 70 0 0 1 165 95"
            fill="none"
            stroke="var(--outline-variant)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active arc */}
          <path
            d="M 15 95 A 70 70 0 0 1 165 95"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          {/* Target marker (optional) */}
          {target !== null && (
            <circle
              cx={90 + 70 * Math.cos(Math.PI * (1 - target / 100))}
              cy={95 - 70 * Math.sin(Math.PI * (1 - target / 100))}
              r={4}
              fill="#d1b65c"
            >
              <title>{`Meta: ${target}%`}</title>
            </circle>
          )}
        </svg>

        {/* Center Value */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className={`font-bold text-on-surface ${compact ? "text-sm" : "text-headline-md"}`}>
            {safeVal.toFixed(1)}{unit}
          </span>
          <span className={compact ? "text-[9px] text-on-surface-variant" : "text-body-xs text-on-surface-variant"}>
            Meta: {target}{unit}
          </span>
        </div>
      </div>

      <div className={`flex w-full max-w-[170px] justify-between text-on-surface-variant ${compact ? "mt-0 text-[8px]" : "mt-1 text-body-xs"}`}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
