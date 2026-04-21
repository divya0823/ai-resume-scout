interface Props {
  value: number;
  size?: number;
  label?: string;
  status?: string;
  thickness?: number;
}
export function ScoreGauge({ value, size = 160, label = "Score", status, thickness }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = thickness ?? Math.max(8, Math.round(size / 14));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = v >= 75 ? "var(--color-success)" : v >= 50 ? "var(--color-warning)" : "var(--color-destructive)";
  const auto = v >= 75 ? "Good" : v >= 50 ? "Average" : "Needs work";
  const fontMain = Math.round(size / 5);
  const fontSub = Math.max(10, Math.round(size / 14));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-muted)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: fontMain }} className="font-bold leading-none">{Math.round(v)}</span>
          <span style={{ fontSize: fontSub }} className="text-muted-foreground mt-1">{label}</span>
        </div>
      </div>
      {(status || size >= 120) && (
        <span className="text-sm font-medium" style={{ color }}>{status || auto}</span>
      )}
    </div>
  );
}

interface MiniProps { label: string; value: number; }
export function MiniScore({ label, value }: MiniProps) {
  const v = Math.max(0, Math.min(100, value || 0));
  const color = v >= 75 ? "var(--color-success)" : v >= 50 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{Math.round(v)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
    </div>
  );
}
