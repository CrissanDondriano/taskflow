interface CircularGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

/**
 * Reusable circular progress gauge — used for the AI productivity score,
 * completion rate, and project health score. One component, three contexts,
 * rather than three bespoke SVGs.
 */
export function CircularGauge({ value, size = 96, strokeWidth = 8, color = "var(--tf-primary)", label, sublabel }: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold" style={{ color: "var(--tf-ink)", fontSize: size * 0.22 }}>
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && (
          <span className="font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)", fontSize: size * 0.075 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
