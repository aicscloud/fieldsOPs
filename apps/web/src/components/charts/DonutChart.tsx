'use client';

type Slice = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  data,
  centerLabel = 'Total',
}: {
  data: Slice[];
  centerLabel?: string;
}) {
  const size = 220;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;

  let offset = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const len = (d.value / total) * c;
      const item = { ...d, dash: len, offset };
      offset += len;
      return item;
    });

  if (!slices.length) {
    return <div className="empty" style={{ padding: 24 }}>Pas de données.</div>;
  }

  return (
    <div className="donut-wrap">
      <svg
        className="chart-svg donut-svg"
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Diagramme en anneau"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        {slices.map((s) => (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${c - s.dash}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          >
            <title>
              {s.label}: {s.value}
            </title>
          </circle>
        ))}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          fontSize="12"
          fill="var(--muted)"
        >
          {centerLabel}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          fontSize="22"
          fill="var(--ink)"
          fontWeight="600"
        >
          {data.reduce((a, d) => a + d.value, 0)}
        </text>
      </svg>
      <div className="chart-legend donut-legend">
        {data.map((d) => (
          <div key={d.label} className="chart-legend-item">
            <span className="chart-swatch" style={{ background: d.color }} />
            {d.label} ({d.value})
          </div>
        ))}
      </div>
    </div>
  );
}
