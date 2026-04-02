"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 32,
  positive,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  const color =
    positive === false
      ? "var(--tc-accent-down)"
      : positive === true
        ? "var(--tc-accent-up)"
        : data[data.length - 1] >= data[0]
          ? "var(--tc-accent-up)"
          : "var(--tc-accent-down)";

  const areaColor =
    positive === false
      ? "var(--tc-accent-down-bg)"
      : data[data.length - 1] >= data[0]
        ? "var(--tc-accent-up-bg)"
        : "var(--tc-accent-down-bg)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="sparkline"
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
