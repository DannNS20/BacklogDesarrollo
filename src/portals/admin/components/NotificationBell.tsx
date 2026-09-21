import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppNotification } from '../../../../shared/contracts';
import { relativeTime } from '../../../lib/format';
import { adminApi } from '../api';
import { NOTIFICATION_STYLES } from './notificationStyles';

export function NotificationBell({ unread, onRefresh }: { unread: number; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    adminApi
      .notifications('unread')
      .then(list => setItems(list.slice(0, 6)))
      .catch(() => setItems([]));
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={`Notificaciones: ${unread} sin leer`}
        className="relative grid size-10 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
      >
        <motion.span key={unread} animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : {}} transition={{ duration: 0.6 }}>
          <Bell className="size-5" />
        </motion.span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-terracota-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <p className="font-display text-sm font-bold text-stone-900">Notificaciones</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await adminApi.markAllRead();
                    setItems([]);
                    onRefresh();
                  }}
                  className="text-xs font-semibold text-verde-700 hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto scrollbar-thin">
              {items === null ? (
                <li className="px-4 py-6 text-center text-xs text-stone-400">Cargando…</li>
              ) : items.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-stone-500">No tienes notificaciones pendientes.</li>
              ) : (
                items.map(item => {
                  const style = NOTIFICATION_STYLES[item.type];
                  return (
                    <li key={item.id} className="flex gap-3 px-4 py-3">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${style.tone}`}>
                        <style.icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                        <p className="line-clamp-2 text-xs text-stone-500">{item.body}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400">{relativeTime(item.createdAt)}</p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            <Link
              to="/admin/notificaciones"
              onClick={() => setOpen(false)}
              className="block border-t border-stone-100 bg-stone-50 px-4 py-2.5 text-center text-xs font-semibold text-verde-700 hover:bg-stone-100"
            >
              Ver todas las notificaciones
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
