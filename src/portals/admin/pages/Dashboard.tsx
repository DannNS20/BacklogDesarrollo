import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Clock,
  KeyRound,
  LogIn,
  LogOut,
  Radio,
  TrendingUp,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { capitalize, formatDate, formatDuration, formatHours, formatTime, minutesSince, toHours } from '../../../lib/format';
import { buttonStyles } from '../../../ui/Button';
import { Avatar, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, SectionCard, StatCard } from '../../../ui/Display';
import { adminApi } from '../api';
import { DailyHoursChart } from '../components/DailyHoursChart';
import { useAdminContext } from '../context';

export default function Dashboard() {
  const { admin } = useAdminContext();
  const now = useNow(30_000);
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard(), [], { pollMs: 30_000 });

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;

  const alerts: Array<{ to: string; icon: LucideIcon; text: string; tone: string }> = [];
  if (data.pendingResets)
    alerts.push({
      to: '/admin/notificaciones',
      icon: KeyRound,
      text: `${data.pendingResets} ${data.pendingResets === 1 ? 'solicitud' : 'solicitudes'} de contraseña por atender`,
      tone: 'border-terracota-200 bg-terracota-50 text-terracota-800',
    });
  if (data.missingCheckouts)
    alerts.push({
      to: '/admin/asistencias?estado=open&rango=todo',
      icon: TriangleAlert,
      text: `${data.missingCheckouts} ${data.missingCheckouts === 1 ? 'registro' : 'registros'} sin salida de días anteriores`,
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
    });

  return (
    <>
      <PageHeader
        eyebrow={capitalize(formatDate(now, 'long'))}
        title="Panel de servicio social"
        description={admin.role === 'superadmin' ? 'Vista general de todos los prestadores del centro universitario.' : 'Vista de los prestadores asignados a tu área.'}
        actions={
          <Link to="/admin/prestadores/nuevo" className={buttonStyles('primary')}>
            <UserPlus className="size-4" />
            Registrar prestador
          </Link>
        }
      />

      {data.activeStudents === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Aún no hay prestadores registrados"
            description="Registra a los estudiantes de servicio social con su horario. El sistema generará su contraseña para que puedan acceder a su portal."
            action={
              <Link to="/admin/prestadores/nuevo" className={buttonStyles('primary')}>
                <UserPlus className="size-4" />
                Registrar el primer prestador
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="mb-5 grid gap-3 md:grid-cols-2">
              {alerts.map(alert => (
                <Link key={alert.to} to={alert.to} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition hover:shadow-sm ${alert.tone}`}>
                  <alert.icon className="size-5 shrink-0" />
                  <span className="flex-1">{alert.text}</span>
                  <ArrowRight className="size-4" />
                </Link>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Prestadores activos" value={data.activeStudents} hint={`${data.completedStudents} con servicio completado`} />
            <StatCard icon={Radio} tone="terracota" label="En servicio ahora" value={data.inService.length} hint={`${data.lateToday} con retardo hoy`} />
            <StatCard icon={Clock} tone="cafe" label="Horas registradas hoy" value={toHours(data.minutesToday)} suffix="h" hint="Incluye jornadas en curso" />
            <StatCard icon={Award} tone="amber" label="Horas válidas acumuladas" value={toHours(data.validMinutesTotal)} suffix="h" hint="Solo registros válidos" />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-5">
            <SectionCard className="xl:col-span-3" title="Horas registradas" description="Horas válidas por día · últimos 14 días" icon={BarChart3}>
              <DailyHoursChart data={data.dailyMinutes} />
            </SectionCard>

            <SectionCard className="xl:col-span-2" title="En servicio ahora" description="Jornadas abiertas hoy" icon={Radio}>
              {data.inService.length ? (
                <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {data.inService.map(item => (
                      <motion.li key={item.recordId} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={item.studentName} />
                        <div className="min-w-0 flex-1">
                          <Link to={`/admin/prestadores/${item.studentId}`} className="block truncate text-sm font-semibold text-stone-800 hover:text-verde-700">
                            {item.studentName}
                          </Link>
                          <p className="truncate text-xs text-stone-500">
                            Desde {formatTime(item.checkIn)}
                            {item.scheduledEnd && ` · salida ${item.scheduledEnd}`}
                            {item.lateMinutes > 0 && <span className="text-amber-700"> · retardo {item.lateMinutes} min</span>}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-semibold text-verde-700 tabular-nums">{formatDuration(minutesSince(item.checkIn, now))}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="px-5 py-12 text-center text-sm text-stone-500">Nadie tiene una jornada abierta en este momento.</p>
              )}
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-5">
            <SectionCard
              className="xl:col-span-2"
              title="Mayor avance"
              description="Prestadores más cerca de completar"
              icon={TrendingUp}
              action={
                <Link to="/admin/prestadores" className="text-xs font-semibold text-verde-700 hover:underline">
                  Ver todos
                </Link>
              }
            >
              <ul className="space-y-4 px-5 py-4">
                {data.progress.map(item => {
                  const ratio = item.validMinutes / (item.requiredHours * 60);
                  return (
                    <li key={item.studentId}>
                      <Link to={`/admin/prestadores/${item.studentId}`} className="group block">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-stone-700 group-hover:text-verde-700">{item.studentName}</span>
                          <span className="shrink-0 text-xs text-stone-500">
                            <b className="text-stone-800">{formatHours(item.validMinutes)}</b> / {item.requiredHours} h
                          </span>
                        </div>
                        <ProgressBar value={ratio} className="mt-1.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard className="xl:col-span-3" title="Actividad de hoy" description="Entradas y salidas registradas" icon={Activity}>
              {data.activity.length ? (
                <ol className="max-h-80 overflow-y-auto px-5 py-3 scrollbar-thin">
                  {data.activity.map(item => (
                    <li key={item.id} className="flex items-center gap-3 border-l-2 border-stone-100 py-2 pl-4">
                      <span
                        className={`-ml-[27px] grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-white ${item.type === 'in' ? 'bg-verde-600 text-white' : 'bg-terracota-500 text-white'}`}
                      >
                        {item.type === 'in' ? <LogIn className="size-3" /> : <LogOut className="size-3" />}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <Link to={`/admin/prestadores/${item.studentId}`} className="font-semibold text-stone-800 hover:text-verde-700">
                          {item.studentName}
                        </Link>{' '}
                        <span className="text-stone-500">{item.type === 'in' ? 'registró su entrada' : 'registró su salida'}</span>
                      </p>
                      <span className="font-mono text-xs text-stone-500">{formatTime(item.at)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-5 py-12 text-center text-sm text-stone-500">Sin movimientos registrados hoy.</p>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
