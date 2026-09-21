import { useState } from 'react';
import { formatDate, formatDuration } from '../../../lib/format';

interface DailyHoursChartProps {
  data: Array<{ date: string; minutes: number }>;
}

const WIDTH = 640;
const HEIGHT = 230;
const MARGIN = { top: 14, right: 8, bottom: 30, left: 34 };
const BAR_COLOR = '#1e6b3a';

function niceStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Barra con esquinas superiores redondeadas (4 px) y base recta */
function barPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

/** Columnas de una sola serie: horas válidas registradas por día */
export function DailyHoursChart({ data }: DailyHoursChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const hours = data.map(point => point.minutes / 60);
  const step = niceStep(Math.max(...hours, 4) / 4);
  const top = Math.max(step, Math.ceil(Math.max(...hours, 0.01) / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const band = innerWidth / data.length;
  const barWidth = Math.min(24, band * 0.62);
  const y = (value: number) => MARGIN.top + innerHeight - (value / top) * innerHeight;
  const total = data.reduce((sum, point) => sum + point.minutes, 0);

  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-3 text-xs text-stone-500">
        <span>
          Total del periodo: <b className="text-stone-800">{formatDuration(total)}</b>
        </span>
        <button type="button" onClick={() => setShowTable(value => !value)} className="font-semibold text-verde-700 hover:underline">
          {showTable ? 'Ver gráfica' : 'Ver como tabla'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-64 overflow-y-auto px-5 py-3 scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="py-1 font-medium">Día</th>
                <th className="py-1 text-right font-medium">Horas válidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.map(point => (
                <tr key={point.date}>
                  <td className="py-1.5 text-stone-700">{formatDate(point.date, 'weekday')}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-stone-800">{formatDuration(point.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative px-3 pb-3">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Horas válidas registradas por día en los últimos 14 días">
            {ticks.map(tick => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#e7e5e4" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fill="#a8a29e" fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {tick}
                </text>
              </g>
            ))}
            <text x={4} y={MARGIN.top - 2} fill="#a8a29e" fontSize={10}>
              h
            </text>

            {data.map((point, index) => {
              const value = hours[index];
              const height = (value / top) * innerHeight;
              const center = MARGIN.left + band * index + band / 2;
              const dimmed = active !== null && active !== index;
              const showLabel = (data.length - 1 - index) % 2 === 0;
              return (
                <g key={point.date}>
                  <rect
                    x={MARGIN.left + band * index}
                    y={MARGIN.top}
                    width={band}
                    height={innerHeight}
                    fill={active === index ? '#f5f5f4' : 'transparent'}
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => setActive(index)}
                  />
                  {height > 0 && (
                    <path d={barPath(center - barWidth / 2, y(value), barWidth, height)} fill={BAR_COLOR} opacity={dimmed ? 0.45 : 1} pointerEvents="none" />
                  )}
                  {showLabel && (
                    <text x={center} y={HEIGHT - 10} textAnchor="middle" fill={index === data.length - 1 ? '#292524' : '#78716c'} fontSize={11} fontWeight={index === data.length - 1 ? 700 : 400}>
                      {index === data.length - 1 ? 'Hoy' : formatDate(point.date, 'short').replace('.', '')}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {active !== null && (
            <div
              className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${((MARGIN.left + band * active + band / 2) / WIDTH) * 100}%` }}
            >
              <p className="font-medium text-stone-500">{formatDate(data[active].date, 'weekday')}</p>
              <p className="font-display text-sm font-bold text-stone-900">{formatDuration(data[active].minutes)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
