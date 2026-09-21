import { Bell, CheckCheck, ChevronRight, Circle, KeyRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppNotification, NotificationType } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { capitalize, dateKey, formatDate, formatTime } from '../../../lib/format';
import { Button, buttonStyles } from '../../../ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';
import { StudentPasswordReset, type CredentialsRecipient } from '../components/CredentialsDialog';
import { NOTIFICATION_STYLES } from '../components/notificationStyles';
import { useAdminContext } from '../context';

const dayLabel = (iso: string) => {
  const key = dateKey(new Date(iso));
  if (key === dateKey(new Date())) return 'Hoy';
  if (key === dateKey(new Date(Date.now() - 86_400_000))) return 'Ayer';
  return capitalize(formatDate(iso, 'long'));
};

export default function Notifications() {
  const toast = useToast();
  const { refreshSummary } = useAdminContext();
  const [filter, setFilter] = useState<'unread' | 'all'>('unread');
  const [type, setType] = useState<NotificationType | 'any'>('any');
  const [resetTarget, setResetTarget] = useState<CredentialsRecipient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = useAsync(() => adminApi.notifications(filter), [filter], { pollMs: 30_000 });

  const items = useMemo(() => (list.data ?? []).filter(item => type === 'any' || item.type === type), [list.data, type]);
  const groups = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const item of items) map.set(dayLabel(item.createdAt), [...(map.get(dayLabel(item.createdAt)) ?? []), item]);
    return [...map];
  }, [items]);

  const refresh = () => {
    void list.reload();
    refreshSummary();
  };

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      refresh();
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openReset = (item: AppNotification) =>
    run(item.id, async () => {
      const student = await adminApi.student(item.studentId!);
      setResetTarget({ id: student.id, name: student.fullName, email: student.email, code: student.code });
    });

  const countBy = (t: NotificationType) => (list.data ?? []).filter(item => item.type === t).length;

  return (
    <>
      <PageHeader
        eyebrow="Seguimiento"
        title="Notificaciones"
        description="Solicitudes de contraseña, servicios completados, retardos y registros pendientes de corregir."
        actions={
          <Button icon={<CheckCheck className="size-4" />} onClick={() => run('all', () => adminApi.markAllRead())} loading={busyId === 'all'}>
            Marcar todas como leídas
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="notifications-read"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'unread', label: 'Sin leer' },
            { value: 'all', label: 'Todas' },
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          <TypeChip active={type === 'any'} onClick={() => setType('any')} label="Todos los tipos" />
          {(Object.keys(NOTIFICATION_STYLES) as NotificationType[]).map(key => (
            <TypeChip key={key} active={type === key} onClick={() => setType(key)} label={`${NOTIFICATION_STYLES[key].label} (${countBy(key)})`} />
          ))}
        </div>
      </div>

      {!list.data ? (
        list.loading ? <PageLoader /> : <ErrorState message={list.error ?? ''} onRetry={list.reload} />
      ) : groups.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'Estás al día' : 'Sin notificaciones'}
            description={filter === 'unread' ? 'No hay notificaciones pendientes por revisar.' : 'Aquí aparecerán las alertas de tus prestadores.'}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([label, entries]) => (
            <section key={label}>
              <p className="eyebrow mb-2 text-stone-500">{label}</p>
              <ul className="card divide-y divide-stone-100 overflow-hidden">
                <AnimatePresence initial={false}>
                  {entries.map(item => {
                    const style = NOTIFICATION_STYLES[item.type];
                    const pendingReset = item.type === 'password_reset' && item.requestStatus === 'pending';
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${item.readAt ? '' : 'bg-verde-50/30'}`}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.tone}`}>
                          <style.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!item.readAt && <Circle className="size-2 fill-terracota-500 text-terracota-500" />}
                            <p className="font-semibold text-stone-900">{item.title}</p>
                            {item.type === 'password_reset' && item.requestStatus && item.requestStatus !== 'pending' && (
                              <Badge tone={item.requestStatus === 'resolved' ? 'verde' : 'neutral'}>{item.requestStatus === 'resolved' ? 'Atendida' : 'Descartada'}</Badge>
                            )}
                            <span className="text-xs text-stone-400">{formatTime(item.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-stone-600">{item.body}</p>
                          {item.studentId && (
                            <Link to={`/admin/prestadores/${item.studentId}`} className="mt-1 inline-flex items-center text-xs font-semibold text-verde-700 hover:underline">
                              Ver expediente <ChevronRight className="size-3.5" />
                            </Link>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                          {pendingReset && (
                            <>
                              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={() => run(item.id, () => adminApi.dismissResetRequest(item.refId!))}>
                                Descartar
                              </Button>
                              <Button size="sm" variant="accent" icon={<KeyRound className="size-3.5" />} loading={busyId === item.id} onClick={() => openReset(item)}>
                                Generar contraseña
                              </Button>
                            </>
                          )}
                          {item.type === 'missing_checkout' && item.studentId && (
                            <Link to={`/admin/asistencias?estudiante=${item.studentId}&estado=open&rango=todo`} className={buttonStyles('secondary', 'sm')}>
                              Corregir registro
                            </Link>
                          )}
                          {!item.readAt && !pendingReset && (
                            <Button size="sm" variant="ghost" loading={busyId === item.id} onClick={() => run(item.id, () => adminApi.markRead(item.id))}>
                              Marcar como leída
                            </Button>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <StudentPasswordReset student={resetTarget} onClose={() => setResetTarget(null)} onCompleted={refresh} />
    </>
  );
}

function TypeChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${active ? 'bg-verde-600 text-white ring-verde-600' : 'bg-white text-stone-600 ring-stone-200 hover:ring-stone-300'}`}
    >
      {label}
    </button>
  );
}
