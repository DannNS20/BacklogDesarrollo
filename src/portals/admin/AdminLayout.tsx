import { Bell, ClipboardList, LayoutDashboard, Mail, MailWarning, Menu, ShieldCheck, UserPlus, Users, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../../brand/Logo';
import { useAsync } from '../../hooks/useAsync';
import { UserMenu } from '../../ui/UserMenu';
import { adminApi } from './api';
import { NotificationBell } from './components/NotificationBell';
import type { AdminOutletContext } from './context';
import { useSession } from './session';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

export default function AdminLayout() {
  const { user, signOut } = useSession();
  const admin = user!;
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const summary = useAsync(() => adminApi.summary(), [], { pollMs: 30_000 });
  const meta = useAsync(() => adminApi.meta(), []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/acceso', { replace: true });
  };

  const groups: Array<{ title: string; items: NavItem[] }> = [
    { title: 'General', items: [{ to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true }] },
    {
      title: 'Gestión',
      items: [
        { to: '/admin/prestadores', label: 'Prestadores', icon: Users },
        { to: '/admin/asistencias', label: 'Asistencias', icon: ClipboardList },
        { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell, badge: summary.data?.unread },
      ],
    },
    ...(admin.role === 'superadmin'
      ? [{ title: 'Administración', items: [{ to: '/admin/responsables', label: 'Responsables', icon: ShieldCheck }] }]
      : []),
  ];

  const context: AdminOutletContext = {
    admin,
    meta: meta.data,
    summary: summary.data,
    refreshSummary: () => void summary.reload(),
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="brand-hero-admin px-5 pt-5 pb-4 text-white">
        <Link to="/admin" onClick={() => setDrawerOpen(false)}>
          <Wordmark size="md" tone="white" subtitle />
        </Link>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-white/20">
          <ShieldCheck className="size-3.5" />
          Portal Administrativo
        </p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin">
        {groups.map(group => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-stone-400 uppercase">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-verde-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="admin-nav"
                          className="absolute inset-0 rounded-lg bg-verde-50 ring-1 ring-verde-100"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                        />
                      )}
                      {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-verde-600" />}
                      <item.icon className={`relative size-[18px] ${isActive ? 'text-verde-700' : 'text-stone-400'}`} />
                      <span className="relative flex-1">{item.label}</span>
                      {!!item.badge && (
                        <span className="relative rounded-full bg-terracota-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">{item.badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <Link
          to="/admin/prestadores/nuevo"
          onClick={() => setDrawerOpen(false)}
          className="mx-1 flex items-center gap-2 rounded-lg border border-dashed border-verde-300 bg-verde-50/50 px-3 py-2.5 text-sm font-semibold text-verde-700 transition hover:bg-verde-50"
        >
          <UserPlus className="size-4" />
          Registrar prestador
        </Link>
      </nav>

      <div className="border-t border-stone-100 px-5 py-4 text-xs text-stone-500">
        <p className="flex items-center gap-1.5">
          {meta.data?.smtpConfigured ? <Mail className="size-3.5 text-verde-600" /> : <MailWarning className="size-3.5 text-amber-600" />}
          {meta.data?.smtpConfigured ? 'Correo saliente activo' : 'Correo en modo local'}
        </p>
        <p className="mt-1">{admin.role === 'superadmin' ? 'Administrador general' : `Responsable · ${admin.area || 'Área'}`}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-page">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 border-r border-stone-200 bg-white lg:block print:hidden">{sidebar}</aside>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-stone-950/40" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="relative h-full w-72 bg-white shadow-2xl"
            >
              <button type="button" onClick={() => setDrawerOpen(false)} className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-white/80 hover:bg-white/10" aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-68 print:pl-0">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur print:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </button>
              <span className="lg:hidden">
                <Wordmark size="sm" />
              </span>
              <p className="hidden text-sm text-stone-500 lg:block">
                <span className="font-semibold text-stone-800">Coordinación de Servicio Social</span> · Centro Universitario de Tlaquepaque
              </p>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell unread={summary.data?.unread ?? 0} onRefresh={context.refreshSummary} />
              <UserMenu
                name={admin.fullName}
                role={admin.role === 'superadmin' ? 'Administrador general' : 'Responsable'}
                detail={admin.email}
                links={admin.role === 'superadmin' ? [{ to: '/admin/responsables', label: 'Responsables', icon: ShieldCheck }] : []}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8 print:max-w-none print:p-0">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet context={context} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
