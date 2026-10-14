/** A circular progress indicator with the figure in the middle. `value` is 0..1. */
export function ProgressRing({
  value,
  label,
  sublabel,
  size = 132,
}: {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="text-jade-400 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div dir="ltr" className="absolute inset-0 grid place-content-center text-center text-white">
        <span className="font-display text-3xl font-semibold leading-none tabular-nums">{label}</span>
        {sublabel && <span className="mt-1 text-[11px] font-semibold text-ink-300">{sublabel}</span>}
      </div>
    </div>
  );
}
