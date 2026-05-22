"use client";

export function Sparkline({
  data,
  tone = "green",
  height = 60,
}: {
  data: number[];
  tone?: "green" | "red" | "cyan" | "violet" | "amber";
  height?: number;
}) {
  const w = 200;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });

  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${path} L${w},${h} L0,${h} Z`;

  const colors: Record<string, string> = {
    green: "rgb(0, 255, 157)",
    red: "rgb(255, 46, 59)",
    cyan: "rgb(0, 229, 255)",
    violet: "rgb(123, 43, 255)",
    amber: "rgb(255, 176, 0)",
  };
  const c = colors[tone];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={`g-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.35" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#g-${tone})`} />
      <path d={path} stroke={c} strokeWidth="1.4" fill="none" />
    </svg>
  );
}
