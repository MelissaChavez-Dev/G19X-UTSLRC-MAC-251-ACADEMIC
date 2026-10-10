export default function GaugeWidget({
  value = 0,
  target = 50,
  min = 0,
  max = 100,
  title = "",
  unit = "%",
  color = "#4f8070",
}) {
  const safeVal = Math.max(min, Math.min(max, Number(value) || 0));
  const pct = (safeVal - min) / (max - min);

  // SVG parameters for semicircle gauge
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center justify-center p-2 text-center">
      {title && <span className="mb-1 text-label-sm text-on-surface-variant">{title}</span>}

      <div className="relative flex items-center justify-center">
        <svg width="180" height="105" viewBox="0 0 180 105">
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
          <span className="text-headline-md font-bold text-on-surface">
            {safeVal.toFixed(1)}{unit}
          </span>
          <span className="text-body-xs text-on-surface-variant">
            Meta: {target}{unit}
          </span>
        </div>
      </div>

      <div className="mt-1 flex w-full max-w-[170px] justify-between text-body-xs text-on-surface-variant">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
