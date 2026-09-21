import { Download, History as HistoryIcon, MessageSquareWarning } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AttendanceRecord } from '../../../../shared/contracts';
import { EvidencePanel, EvidenceThumb } from '../../../components/Evidence';
import { RecordBadges } from '../../../components/RecordBadges';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { capitalize, dateKey, formatDate, formatDuration, formatHours, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { EmptyState, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Modal, ModalBody } from '../../../ui/Modal';
import { Segmented } from '../../../ui/Segmented';
import { studentApi } from '../api';

type Filter = 'all' | 'valid' | 'late' | 'rejected';

const matches = (record: AttendanceRecord, filter: Filter) =>
  filter === 'all' ||
  (filter === 'valid' && record.status === 'valid' && !!record.checkOut) ||
  (filter === 'late' && record.lateMinutes > 0) ||
  (filter === 'rejected' && record.status === 'rejected');

export default function StudentHistory() {
  const { data, loading, error, reload } = useAsync(() => studentApi.attendance(), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const record of (data ?? []).filter(r => matches(r, filter))) {
      const key = capitalize(new Date(record.checkIn).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
      map.set(key, [...(map.get(key) ?? []), record]);
    }
    return [...map];
  }, [data, filter]);

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;

  const count = (f: Filter) => data.filter(r => matches(r, f)).length;

  const exportCsv = () =>
    downloadCsv(`mi-historial-servicio-social-${dateKey(new Date())}.csv`, [
      ['Fecha', 'Entrada', 'Salida', 'Minutos', 'Estado', 'Retardo (min)', 'Biometría', 'Origen', 'Observación'],
      ...data.map(r => [
        dateKey(new Date(r.checkIn)),
        formatTime(r.checkIn),
        r.checkOut ? formatTime(r.checkOut) : 'Sin salida',
        r.minutes,
        r.status === 'valid' ? 'Válido' : 'Invalidado',
        r.lateMinutes,
        r.checkInEvidence.biometric ? 'Sí' : 'No',
        r.source === 'portal' ? 'Portal' : 'Manual',
        r.reviewNote,
      ]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Mis registros"
        title="Historial de asistencia"
        description="Cada jornada con su evidencia de entrada y salida."
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={!data.length}>
            Descargar CSV
          </Button>
        }
      />

      <div className="mb-4">
        <Segmented
          id="student-history"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: data.length },
            { value: 'valid', label: 'Válidos', count: count('valid') },
            { value: 'late', label: 'Retardos', count: count('late') },
            { value: 'rejected', label: 'Invalidados', count: count('rejected') },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <EmptyState icon={HistoryIcon} title="Sin registros" description="No hay jornadas que coincidan con este filtro." />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([month, records]) => {
            const minutes = records.filter(r => r.status === 'valid').reduce((t, r) => t + r.minutes, 0);
            return (
              <SectionCard key={month} title={month} description={`${records.length} registros · ${formatHours(minutes)} válidas`}>
                <ul className="divide-y divide-stone-100">
                  {records.map(record => (
                    <li key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-semibold text-stone-800">{capitalize(formatDate(record.checkIn, 'weekday'))}</p>
                        <p className="font-mono text-xs text-stone-500">
                          {formatTime(record.checkIn)} – {record.checkOut ? formatTime(record.checkOut) : '…'}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        <RecordBadges record={record} />
                      </div>
                      <div className="flex items-center gap-2">
                        {record.checkInEvidence.photo && (
                          <EvidenceThumb src={studentApi.evidenceUrl(record.id, 'in')} label="Ver evidencia de entrada" onClick={() => setSelected(record)} />
                        )}
                        {record.checkOutEvidence?.photo && (
                          <EvidenceThumb src={studentApi.evidenceUrl(record.id, 'out')} label="Ver evidencia de salida" onClick={() => setSelected(record)} />
                        )}
                      </div>
                      <p className={`w-20 text-right text-sm font-bold ${record.status === 'rejected' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                        {record.checkOut ? formatDuration(record.minutes) : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            );
          })}
        </div>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        size="lg"
        title="Evidencia del registro"
        description={selected ? capitalize(formatDate(selected.checkIn, 'long')) : undefined}
      >
        {selected && (
          <ModalBody className="space-y-4">
            {selected.status === 'rejected' && (
              <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
                <span>
                  <b>Registro invalidado por la Coordinación.</b> {selected.reviewNote || 'Sin observaciones.'}
                </span>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <EvidencePanel title="Entrada" at={selected.checkIn} src={studentApi.evidenceUrl(selected.id, 'in')} evidence={selected.checkInEvidence} />
              <EvidencePanel
                title="Salida"
                at={selected.checkOut}
                src={selected.checkOut ? studentApi.evidenceUrl(selected.id, 'out') : null}
                evidence={selected.checkOutEvidence}
              />
            </div>
          </ModalBody>
        )}
      </Modal>
    </>
  );
}
