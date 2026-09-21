import { ClipboardList, Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AccessRecord, PersonRole } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS, PERSON_ROLES } from '../../../../shared/rules';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { dateKey, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field } from '../../../ui/Field';
import { Segmented } from '../../../ui/Segmented';
import { staffApi, type RecordFilter } from '../api';
import { AccessTable } from '../components/AccessTable';
import { ManualRecordModal } from '../components/ManualRecordModal';
import { useStaffContext } from '../context';

type Range = 'today' | 'week' | 'month' | 'all';

function rangeDates(range: Range) {
  const today = new Date();
  const key = dateKey(today);
  if (range === 'today') return { from: key, to: key };
  if (range === 'week') return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: key };
  if (range === 'month') return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: key };
  return { from: '', to: '' };
}

export default function Records() {
  const { meta } = useStaffContext();
  const [params] = useSearchParams();
  const initial = rangeDates('week');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [personId, setPersonId] = useState(params.get('personId') ?? '');
  const [accessPointId, setAccessPointId] = useState('');
  const [role, setRole] = useState<PersonRole | ''>('');
  const [status, setStatus] = useState<NonNullable<RecordFilter['status']>>('all');
  const [manualOpen, setManualOpen] = useState(false);

  const people = useAsync(() => staffApi.peopleLookup(), []);
  const records = useAsync(
    () =>
      staffApi.records({
        from: from || undefined,
        to: to || undefined,
        personId: personId || undefined,
        accessPointId: accessPointId || undefined,
        role: role || undefined,
        status,
      }),
    [from, to, personId, accessPointId, role, status],
    { pollMs: 60_000 },
  );

  const rows = records.data ?? [];
  const activeRange = (['today', 'week', 'month', 'all'] as const).find(range => {
    const dates = rangeDates(range);
    return dates.from === from && dates.to === to;
  });

  const exportCsv = () =>
    downloadCsv(`accesos-${from || 'inicio'}-a-${to || 'hoy'}.csv`, [
      ['Fecha', 'Código', 'Persona', 'Rol', 'Acceso', 'Entrada', 'Salida', 'Minutos', 'Estado', 'Incidencia', 'Biometría', 'Origen'],
      ...rows.map((record: AccessRecord) => [
        dateKey(new Date(record.checkIn ?? record.checkOut!)),
        record.personCode,
        record.personName,
        record.personRole ? PERSON_ROLE_LABELS[record.personRole] : 'Invitado',
        record.accessPointName,
        record.checkIn ? formatTime(record.checkIn) : 'Sin entrada',
        record.checkOut ? formatTime(record.checkOut) : 'Sin salida',
        record.minutes,
        record.status === 'ok' ? 'Correcto' : 'Incidencia',
        record.incident ?? '',
        record.biometric ? 'Sí' : 'No',
        record.source === 'app' ? 'Celular' : 'Caseta',
      ]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Auditoría"
        title="Registros de acceso"
        description="Historial de entradas y salidas, con filtros por periodo, persona y acceso."
        actions={
          <>
            <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={!rows.length}>
              Exportar
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setManualOpen(true)}>
              Registro manual
            </Button>
          </>
        }
      />

      <section className="card mb-5 space-y-4 p-4">
        <Segmented
          id="records-range"
          value={activeRange ?? null}
          onChange={range => {
            const dates = rangeDates(range);
            setFrom(dates.from);
            setTo(dates.to);
          }}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Últimos 7 días' },
            { value: 'month', label: 'Este mes' },
            { value: 'all', label: 'Todo' },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Desde">
            <input type="date" className="input" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} />
          </Field>
          <Field label="Hasta">
            <input type="date" className="input" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} />
          </Field>
          <Field label="Persona">
            <select className="input" value={personId} onChange={event => setPersonId(event.target.value)}>
              <option value="">Todas</option>
              {(people.data ?? []).map(person => (
                <option key={person.id} value={person.id}>
                  {person.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Acceso">
            <select className="input" value={accessPointId} onChange={event => setAccessPointId(event.target.value)}>
              <option value="">Todos</option>
              {(meta?.accessPoints ?? []).map(point => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rol">
            <select className="input" value={role} onChange={event => setRole(event.target.value as PersonRole | '')}>
              <option value="">Todos</option>
              {PERSON_ROLES.map(value => (
                <option key={value} value={value}>
                  {PERSON_ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Segmented
          id="records-status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'open', label: 'Dentro / sin salida' },
            { value: 'incidencia', label: 'Incidencias' },
            { value: 'ok', label: 'Ciclos completos' },
          ]}
        />
      </section>

      <SectionCard title="Historial" icon={ClipboardList} description={records.data ? `${rows.length} registros` : 'Cargando…'}>
        {records.data ? (
          <AccessTable records={rows} emptyMessage="No hay registros con estos filtros." />
        ) : records.loading ? (
          <PageLoader />
        ) : (
          <div className="p-6">
            <ErrorState message={records.error ?? ''} onRetry={records.reload} />
          </div>
        )}
      </SectionCard>

      <ManualRecordModal open={manualOpen} onClose={() => setManualOpen(false)} onSaved={() => void records.reload()} />
    </>
  );
}
