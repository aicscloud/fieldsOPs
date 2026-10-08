'use client';

const COLORS: Record<string, string> = {
  DRAFT: '#8a96a3',
  SCHEDULED: '#3b6fd4',
  ASSIGNED: '#5b4fcf',
  EN_ROUTE: '#0f9aa8',
  IN_PROGRESS: '#5b4fcf',
  PAUSED: '#c9891a',
  COMPLETED: '#2f9e6b',
  CANCELLED: '#9aa3ad',
  FAILED: '#d64545',
};

export function StatusChart({
  data,
}: {
  data: Array<[string, number]>;
}) {
  const width = 520;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map(([, n]) => n));
  const barW = data.length ? innerW / data.length : innerW;

  if (!data.length) {
    return (
      <div className="empty" style={{ padding: 24 }}>
        Pas encore de données pour le graphique.
      </div>
    );
  }

  return (
    <div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Répartition des interventions par statut"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH - t * innerH;
          const value = Math.round(max * t);
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
                {value}
              </text>
            </g>
          );
        })}

        {data.map(([status, count], i) => {
          const h = (count / max) * innerH;
          const x = pad.left + i * barW + barW * 0.18;
          const y = pad.top + innerH - h;
          const w = barW * 0.64;
          const color = COLORS[status] ?? 'var(--primary)';
          return (
            <g key={status}>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(h, count > 0 ? 2 : 0)}
                fill={color}
                rx="6"
                ry="6"
              >
                <title>
                  {status.replaceAll('_', ' ')}: {count}
                </title>
              </rect>
              <text
                x={x + w / 2}
                y={height - 14}
                textAnchor="middle"
                fontSize="9"
                fill="var(--muted)"
              >
                {status.replaceAll('_', ' ').slice(0, 8)}
              </text>
              <text
                x={x + w / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fill="var(--ink)"
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
