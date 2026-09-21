import { dateKey } from '../../../shared/rules.ts';

export { dateKey };

export function dayBounds(key: string) {
  return {
    start: new Date(`${key}T00:00:00`).toISOString(),
    end: new Date(`${key}T23:59:59.999`).toISOString(),
  };
}

export const todayBounds = () => dayBounds(dateKey(new Date()));

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export const minutesSinceMidnight = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Minutos completos entre dos instantes (redondeo idéntico al de las consultas SQL) */
export function minutesBetween(from: string, to: string | Date): number {
  const end = typeof to === 'string' ? Date.parse(to) : to.getTime();
  return Math.max(0, Math.floor(Math.round((end - Date.parse(from)) / 60) / 1000));
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
