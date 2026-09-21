import { ChevronRight, Download, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StudentSummary } from '../../../../shared/contracts';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { dateKey, formatDate, formatHours, toHours } from '../../../lib/format';
import { normalize } from '../../../lib/text';
import { Button, buttonStyles } from '../../../ui/Button';
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, PulseDot } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { adminApi } from '../api';
import { useAdminContext } from '../context';

type Filter = 'active' | 'in-service' | 'completed' | 'inactive' | 'all';

const matches = (student: StudentSummary, filter: Filter) =>
  filter === 'all' ||
  (filter === 'active' && student.active) ||
  (filter === 'in-service' && student.inService) ||
  (filter === 'completed' && !!student.completedAt) ||
  (filter === 'inactive' && !student.active);

export default function Students() {
  const navigate = useNavigate();
  const { admin, meta } = useAdminContext();
  const { data, loading, error, reload } = useAsync(() => adminApi.students(), [], { pollMs: 60_000 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [supervisor, setSupervisor] = useState('');

  const header = (
    <PageHeader
      eyebrow="Gestión"
      title="Prestadores de servicio social"
      description={admin.role === 'superadmin' ? 'Todos los prestadores registrados en el centro universitario.' : 'Prestadores asignados a tu área.'}
      actions={
        <>
          <Button icon={<Download className="size-4" />} disabled={!data?.length} onClick={() => exportCsv(data ?? [])}>
            Exportar
          </Button>
          <Link to="/admin/prestadores/nuevo" className={buttonStyles('primary')}>
            <UserPlus className="size-4" />
            Registrar prestador
          </Link>
        </>
      }
    />
  );

  if (!data) return (
    <>
      {header}
      {loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />}
    </>
  );

  const q = normalize(query);
  const rows = data
    .filter(student => matches(student, filter))
    .filter(student => !supervisor || student.supervisorId === supervisor)
    .filter(student => !q || normalize(`${student.fullName} ${student.code} ${student.email} ${student.career} ${student.program}`).includes(q));

  const showSupervisor = admin.role === 'superadmin';

  return (
    <>
      {header}

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 lg:flex-row lg:items-center">
          <label className="relative block lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
            <input className="input pl-9" placeholder="Buscar por nombre, código, correo o carrera…" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          {showSupervisor && meta && meta.supervisors.length > 1 && (
            <select className="input lg:w-60" value={supervisor} onChange={event => setSupervisor(event.target.value)} aria-label="Filtrar por responsable">
              <option value="">Todos los responsables</option>
              {meta.supervisors.map(item => (
                <option key={item.id} value={item.id}>
                  {item.fullName}
                </option>
              ))}
            </select>
          )}
          <div className="lg:ml-auto">
            <Segmented
              id="students-filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'active', label: 'Activos', count: data.filter(s => matches(s, 'active')).length },
                { value: 'in-service', label: 'En servicio', count: data.filter(s => matches(s, 'in-service')).length },
                { value: 'completed', label: 'Completaron', count: data.filter(s => matches(s, 'completed')).length },
                { value: 'inactive', label: 'Inactivos', count: data.filter(s => matches(s, 'inactive')).length },
                { value: 'all', label: 'Todos', count: data.length },
              ]}
            />
          </div>
        </div>

        {data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin prestadores registrados"
            description="Registra a un prestador con su código, carrera, correo institucional y horario."
            action={
              <Link to="/admin/prestadores/nuevo" className={buttonStyles('primary')}>
                <UserPlus className="size-4" />
                Registrar prestador
              </Link>
            }
          />
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-stone-500">Ningún prestador coincide con los filtros.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                  <th className="px-5 py-2.5">Prestador</th>
                  <th className="px-5 py-2.5">Carrera · Área</th>
                  {showSupervisor && <th className="px-5 py-2.5">Responsable</th>}
                  <th className="w-52 px-5 py-2.5">Avance</th>
                  <th className="px-5 py-2.5">Última asistencia</th>
                  <th className="px-5 py-2.5">Estado</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(student => {
                  const ratio = student.validMinutes / (student.requiredHours * 60);
                  return (
                    <tr key={student.id} onClick={() => navigate(`/admin/prestadores/${student.id}`)} className="cursor-pointer transition hover:bg-stone-50/80">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.fullName} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-stone-800">{student.fullName}</p>
                            <p className="truncate text-xs text-stone-500">
                              <span className="font-mono">{student.code}</span> · {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-stone-700">{student.career}</p>
                        <p className="text-xs text-stone-500">{student.program || '—'}</p>
                      </td>
                      {showSupervisor && <td className="px-5 py-3 text-stone-600">{student.supervisorName ?? <span className="text-stone-400">Coordinación</span>}</td>}
                      <td className="px-5 py-3">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-stone-800">{formatHours(student.validMinutes)}</span>
                          <span className="text-stone-500">
                            {Math.min(100, Math.round(ratio * 100))}% de {student.requiredHours} h
                          </span>
                        </div>
                        <ProgressBar value={ratio} className="mt-1.5" />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-stone-600">{student.lastCheckIn ? formatDate(student.lastCheckIn) : <span className="text-stone-400">Sin registros</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {student.inService && (
                            <Badge tone="verde">
                              <PulseDot />
                              En servicio
                            </Badge>
                          )}
                          {student.completedAt ? <Badge tone="blue">Completó</Badge> : student.active ? <Badge>Activo</Badge> : <Badge tone="red">Inactivo</Badge>}
                        </div>
                      </td>
                      <td className="pr-4">
                        <ChevronRight className="size-4 text-stone-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function exportCsv(students: StudentSummary[]) {
  downloadCsv(`prestadores-servicio-social-${dateKey(new Date())}.csv`, [
    ['Código', 'Nombre', 'Correo institucional', 'Carrera', 'Área / programa', 'Responsable', 'Horas válidas', 'Horas requeridas', 'Avance %', 'Jornadas', 'Estado'],
    ...students.map(s => [
      s.code,
      s.fullName,
      s.email,
      s.career,
      s.program,
      s.supervisorName ?? 'Coordinación',
      toHours(s.validMinutes),
      s.requiredHours,
      Math.round((s.validMinutes / (s.requiredHours * 60)) * 100),
      s.sessions,
      s.completedAt ? 'Completó' : s.active ? 'Activo' : 'Inactivo',
    ]),
  ]);
}
