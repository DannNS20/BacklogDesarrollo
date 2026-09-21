import type { ScheduleSlot } from '../../../../shared/contracts';
import { slotMinutes, toMinutes, weeklyMinutes, WEEKDAY_ORDER, WEEKDAYS } from '../../../../shared/rules';
import { formatDuration } from '../../../lib/format';
import { Switch } from '../../../ui/Switch';

const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

const PRESETS = [
  { label: 'L–V · 8:00–12:00', days: WEEKDAYS_MON_FRI, start: '08:00', end: '12:00' },
  { label: 'L–V · 9:00–13:00', days: WEEKDAYS_MON_FRI, start: '09:00', end: '13:00' },
  { label: 'L–V · 14:00–18:00', days: WEEKDAYS_MON_FRI, start: '14:00', end: '18:00' },
  { label: 'Sábado · 8:00–14:00', days: [6], start: '08:00', end: '14:00' },
];

const order = (weekday: number) => (weekday + 6) % 7;
const sorted = (slots: ScheduleSlot[]) => [...slots].sort((a, b) => order(a.weekday) - order(b.weekday));

export function ScheduleEditor({ value, onChange, error }: { value: ScheduleSlot[]; onChange: (slots: ScheduleSlot[]) => void; error?: string }) {
  const byDay = new Map(value.map(slot => [slot.weekday, slot]));
  const template = value[0] ?? { start: '09:00', end: '13:00' };

  const toggle = (weekday: number, enabled: boolean) =>
    onChange(sorted(enabled ? [...value, { weekday, start: template.start, end: template.end }] : value.filter(s => s.weekday !== weekday)));

  const update = (weekday: number, field: 'start' | 'end', time: string) =>
    onChange(value.map(slot => (slot.weekday === weekday ? { ...slot, [field]: time } : slot)));

  return (
    <div>
      <div className={`overflow-hidden rounded-lg border ${error ? 'border-red-300' : 'border-stone-200'}`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 bg-stone-50 px-3 py-2">
          <span className="text-xs font-medium text-stone-500">Plantillas:</span>
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(sorted(preset.days.map(weekday => ({ weekday, start: preset.start, end: preset.end }))))}
              className="rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200 transition hover:text-verde-700 hover:ring-verde-600"
            >
              {preset.label}
            </button>
          ))}
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="ml-auto text-xs font-medium text-stone-500 hover:text-red-600">
              Limpiar
            </button>
          )}
        </div>

        <ul className="divide-y divide-stone-100">
          {WEEKDAY_ORDER.map(weekday => {
            const slot = byDay.get(weekday);
            const invalid = !!slot && toMinutes(slot.end) <= toMinutes(slot.start);
            return (
              <li
                key={weekday}
                className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[auto_6.5rem_1fr_6rem] ${slot ? '' : 'bg-stone-50/60'}`}
              >
                <Switch compact checked={!!slot} onChange={enabled => toggle(weekday, enabled)} label={`Asignar ${WEEKDAYS[weekday]}`} />
                <span className={`text-sm font-medium ${slot ? 'text-stone-800' : 'text-stone-400'}`}>{WEEKDAYS[weekday]}</span>
                {slot ? (
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <input
                      type="time"
                      step={300}
                      value={slot.start}
                      onChange={event => update(weekday, 'start', event.target.value)}
                      aria-label={`Entrada del ${WEEKDAYS[weekday]}`}
                      className={`input h-9 w-[7.5rem] font-mono ${invalid ? 'border-red-400' : ''}`}
                    />
                    <span className="text-xs text-stone-400">a</span>
                    <input
                      type="time"
                      step={300}
                      value={slot.end}
                      onChange={event => update(weekday, 'end', event.target.value)}
                      aria-label={`Salida del ${WEEKDAYS[weekday]}`}
                      className={`input h-9 w-[7.5rem] font-mono ${invalid ? 'border-red-400' : ''}`}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-stone-400 max-sm:hidden">Sin servicio</span>
                )}
                <span className="hidden text-right text-xs sm:block">
                  {slot && (invalid ? <span className="font-medium text-red-600">Revisa las horas</span> : <span className="text-stone-500">{formatDuration(slotMinutes(slot))}</span>)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          <span>
            {value.length} {value.length === 1 ? 'día asignado' : 'días asignados'}
          </span>
          <span className="font-semibold text-stone-800">{formatDuration(weeklyMinutes(value))} por semana</span>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
