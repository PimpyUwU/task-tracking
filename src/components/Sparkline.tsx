/** Tiny gold area sparkline (server-safe, pure SVG). Emphasizes the endpoint. */
export function Sparkline({
  values,
  width = 150,
  height = 44,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const n = values.length;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const pts = values.map((v, i) => {
    const x = n === 1 ? pad : pad + (i / (n - 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });

  const line = pts.map((p) => p.join(",")).join(" ");
  const area =
    `M${pts[0][0]},${pts[0][1]} ` +
    pts
      .slice(1)
      .map((p) => `L${p[0]},${p[1]}`)
      .join(" ") +
    ` L${pts[n - 1][0]},${height} L${pts[0][0]},${height} Z`;
  const end = pts[n - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Daily earnings this week"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="spark-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-gold)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={end[0]} cy={end[1]} r="3" fill="var(--gold)" />
    </svg>
  );
}
