import { DATE_RE, dateKey } from '../../shared/rules';

export { dateKey };

const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

const toDate = (value: string | Date) =>
  typeof value !== 'string' ? value : DATE_RE.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', TIME);

const DATE_STYLES: Record<'short' | 'medium' | 'long' | 'weekday', Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: 'short' },
  medium: { day: '2-digit', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  weekday: { weekday: 'short', day: '2-digit', month: 'short' },
};

export const formatDate = (value: string | Date, style: keyof typeof DATE_STYLES = 'medium') =>
  toDate(value).toLocaleDateString('es-MX', DATE_STYLES[style]);

export const formatDateTime = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

export const toHours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

export const formatHours = (minutes: number) => `${toHours(minutes).toLocaleString('es-MX')} h`;

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')} min` : `${h} h`;
}

export const minutesSince = (iso: string, now = new Date()) => Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60000));

export function relativeTime(iso: string, now = new Date()): string {
  const seconds = (Date.parse(iso) - now.getTime()) / 1000;
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });
  if (abs < 60) return 'hace un momento';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day');
  return formatDate(iso);
}

/** ISO → valor de <input type="datetime-local"> */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${dateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const fromLocalInput = (value: string) => new Date(value).toISOString();

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "09:00" → "9:00" para textos */
export const shortTime = (hhmm: string) => hhmm.replace(/^0/, '');
