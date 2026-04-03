"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export function Sparkline({
  data,
  width = 72,
  height = 28,
  positive,
}: SparklineProps) {
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  // Filter out bad values
  const clean = data.filter((v) => typeof v === "number" && isFinite(v));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;

  const pts = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M 0,${height} L ${pts.join(" L ")} L ${width},${height} Z`;

  const up =
    positive !== undefined
      ? positive
      : (clean[clean.length - 1] ?? 0) >= (clean[0] ?? 0);

  const color = up ? "var(--tc-accent-up)" : "var(--tc-accent-down)";
  const areaColor = up ? "var(--tc-accent-up-bg)" : "var(--tc-accent-down-bg)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      fill="none"
      className="sparkline"
      aria-hidden
    >
      <path d={areaD} fill={areaColor} opacity="0.5" />
      <path
        d={pathD}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
