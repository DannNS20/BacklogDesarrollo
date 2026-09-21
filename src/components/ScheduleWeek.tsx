import type { ScheduleSlot } from '../../shared/contracts';
import { slotMinutes, weeklyMinutes, WEEKDAY_ORDER, WEEKDAYS } from '../../shared/rules';
import { formatDuration } from '../lib/format';
import { Badge } from '../ui/Display';

/** Horario semanal de un prestador (lunes a domingo) */
export function ScheduleWeek({ schedule, highlightToday = true }: { schedule: ScheduleSlot[]; highlightToday?: boolean }) {
  const today = new Date().getDay();
  const byDay = new Map(schedule.map(slot => [slot.weekday, slot]));

  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {WEEKDAY_ORDER.map(day => {
          const slot = byDay.get(day);
          const isToday = highlightToday && day === today;
          return (
            <li key={day} className={`flex items-center justify-between gap-3 px-5 py-2.5 text-sm ${isToday ? 'bg-verde-50/70' : ''}`}>
              <span className={`flex items-center gap-2 ${slot ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
                {WEEKDAYS[day]}
                {isToday && <Badge tone="verde">Hoy</Badge>}
              </span>
              {slot ? (
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[13px] font-semibold text-stone-800">
                    {slot.start} – {slot.end}
                  </span>
                  <span className="w-16 text-right text-xs text-stone-400">{formatDuration(slotMinutes(slot))}</span>
                </span>
              ) : (
                <span className="text-xs text-stone-400">Sin servicio</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/70 px-5 py-2.5 text-xs text-stone-500">
        <span>{schedule.length} {schedule.length === 1 ? 'día' : 'días'} por semana</span>
        <span className="font-semibold text-stone-700">{formatDuration(weeklyMinutes(schedule))} semanales</span>
      </div>
    </div>
  );
}
