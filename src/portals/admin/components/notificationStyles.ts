import { Award, Clock, KeyRound, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { NotificationType } from '../../../../shared/contracts';

export const NOTIFICATION_STYLES: Record<NotificationType, { icon: LucideIcon; tone: string; label: string }> = {
  password_reset: { icon: KeyRound, tone: 'bg-terracota-50 text-terracota-600', label: 'Contraseñas' },
  hours_completed: { icon: Award, tone: 'bg-verde-50 text-verde-700', label: 'Servicios completados' },
  milestone: { icon: TrendingUp, tone: 'bg-lime-50 text-oliva-700', label: 'Avances' },
  missing_checkout: { icon: TriangleAlert, tone: 'bg-amber-50 text-amber-700', label: 'Sin salida' },
  late_arrival: { icon: Clock, tone: 'bg-amber-50 text-amber-700', label: 'Retardos' },
};
