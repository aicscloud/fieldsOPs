'use client';

type Series = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

export function LineChart({
  labels,
  series,
  height = 240,
}: {
  labels: string[];
  series: Series[];
  height?: number;
}) {
  const width = 640;
  const pad = { top: 18, right: 16, bottom: 36, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = Math.max(labels.length - 1, 1);

  function point(i: number, value: number) {
    const x = pad.left + (i / n) * innerW;
    const y = pad.top + innerH - (value / max) * innerH;
    return { x, y };
  }

  function pathFor(values: number[]) {
    if (!values.length) return '';
    return values
      .map((v, i) => {
        const { x, y } = point(i, v);
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
  }

  function areaFor(values: number[]) {
    if (!values.length) return '';
    const line = pathFor(values);
    const last = point(values.length - 1, values[values.length - 1] ?? 0);
    const first = point(0, values[0] ?? 0);
    return `${line} L${last.x},${pad.top + innerH} L${first.x},${pad.top + innerH} Z`;
  }

  if (!labels.length) {
    return <div className="empty" style={{ padding: 24 }}>Pas de données.</div>;
  }

  return (
    <div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Courbe d’activité"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH - t * innerH;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted)"
              >
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}

        {series.map((s, idx) => (
          <g key={s.key}>
            {idx === 0 ? (
              <path d={areaFor(s.values)} fill={s.color} opacity="0.12" />
            ) : null}
            <path
              d={pathFor(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) => {
              const { x, y } = point(i, v);
              return (
                <circle key={`${s.key}-${i}`} cx={x} cy={y} r="3.5" fill={s.color}>
                  <title>
                    {labels[i]} · {s.label}: {v}
                  </title>
                </circle>
              );
            })}
          </g>
        ))}

        {labels.map((label, i) => {
          if (i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) {
            return null;
          }
          const { x } = point(i, 0);
          const short = label.slice(5).replace('-', '/');
          return (
            <text
              key={label}
              x={x}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {short}
            </text>
          );
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <div key={s.key} className="chart-legend-item">
            <span className="chart-swatch" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
