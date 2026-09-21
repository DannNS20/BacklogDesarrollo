import { ClipboardList, Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AttendanceRow } from '../../../../shared/contracts';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { dateKey, formatDuration, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field } from '../../../ui/Field';
import { Segmented } from '../../../ui/Segmented';
import { useToast } from '../../../ui/toast';
import { adminApi, type AttendanceStatusFilter } from '../api';
import { AttendanceTable } from '../components/AttendanceTable';
import { EvidenceReviewModal } from '../components/EvidenceReviewModal';
import { RecordModal } from '../components/RecordModal';
import { useAdminContext } from '../context';

type Range = 'today' | 'week' | 'month' | 'all';

function rangeDates(range: Range) {
  const today = new Date();
  const todayKey = dateKey(today);
  if (range === 'today') return { from: todayKey, to: todayKey };
  if (range === 'week') return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: todayKey };
  if (range === 'month') return { from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayKey };
  return { from: '', to: '' };
}

const STATUS_VALUES: AttendanceStatusFilter[] = ['all', 'open', 'valid', 'rejected', 'late'];

export default function Attendance() {
  const toast = useToast();
  const { admin } = useAdminContext();
  const [params] = useSearchParams();
  const initialRange = rangeDates(params.get('rango') === 'todo' ? 'all' : 'week');
  const initialStatus = params.get('estado') as AttendanceStatusFilter | null;

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [studentId, setStudentId] = useState(params.get('estudiante') ?? '');
  const [status, setStatus] = useState<AttendanceStatusFilter>(initialStatus && STATUS_VALUES.includes(initialStatus) ? initialStatus : 'all');
  const [review, setReview] = useState<AttendanceRow | null>(null);
  const [recordModal, setRecordModal] = useState<{ open: boolean; record: AttendanceRow | null }>({ open: false, record: null });
  const [toDelete, setToDelete] = useState<AttendanceRow | null>(null);

  const students = useAsync(() => adminApi.students(), []);
  const records = useAsync(
    () => adminApi.attendance({ from: from || undefined, to: to || undefined, studentId: studentId || undefined, status }),
    [from, to, studentId, status],
    { pollMs: 60_000 },
  );

  const rows = records.data ?? [];
  const validMinutes = rows.filter(r => r.status === 'valid').reduce((total, r) => total + r.minutes, 0);
  const activeRange = (['today', 'week', 'month', 'all'] as const).find(range => {
    const dates = rangeDates(range);
    return dates.from === from && dates.to === to;
  });

  const replaceRow = (row: AttendanceRow) =>
    records.setData(rows.some(r => r.id === row.id) ? rows.map(r => (r.id === row.id ? row : r)) : [row, ...rows]);

  const exportCsv = () =>
    downloadCsv(`asistencias-${from || 'inicio'}-a-${to || 'hoy'}.csv`, [
      ['Fecha', 'Código', 'Prestador', 'Entrada', 'Salida', 'Minutos', 'Estado', 'Retardo (min)', 'Biometría', 'Ubicación', 'Origen', 'Notas', 'Observación'],
      ...rows.map(r => [
        dateKey(new Date(r.checkIn)),
        r.studentCode,
        r.studentName,
        formatTime(r.checkIn),
        r.checkOut ? formatTime(r.checkOut) : 'Sin salida',
        r.minutes,
        r.status === 'valid' ? 'Válido' : 'Invalidado',
        r.lateMinutes,
        r.checkInEvidence.biometric ? 'Sí' : 'No',
        r.checkInEvidence.geo ? `${r.checkInEvidence.geo.lat},${r.checkInEvidence.geo.lng}` : '',
        r.source === 'portal' ? 'Portal' : 'Manual',
        r.notes,
        r.reviewNote,
      ]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Asistencias"
        description="Revisa evidencias, corrige olvidos y exporta los registros del periodo."
        actions={
          <>
            <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={!rows.length}>
              Exportar
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setRecordModal({ open: true, record: null })} disabled={!students.data?.length}>
              Registro manual
            </Button>
          </>
        }
      />

      <section className="card mb-5 space-y-4 p-4">
        <Segmented
          id="attendance-range"
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Desde">
            <input type="date" className="input" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} />
          </Field>
          <Field label="Hasta">
            <input type="date" className="input" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} />
          </Field>
          <Field label="Prestador">
            <select className="input" value={studentId} onChange={event => setStudentId(event.target.value)}>
              <option value="">Todos los prestadores</option>
              {students.data?.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select className="input" value={status} onChange={event => setStatus(event.target.value as AttendanceStatusFilter)}>
              <option value="all">Todos</option>
              <option value="open">Sin salida / en curso</option>
              <option value="valid">Válidos con salida</option>
              <option value="late">Con retardo</option>
              <option value="rejected">Invalidados</option>
            </select>
          </Field>
        </div>
      </section>

      <SectionCard
        title="Registros"
        icon={ClipboardList}
        description={records.data ? `${rows.length} registros · ${formatDuration(validMinutes)} válidas en el periodo` : 'Cargando…'}
      >
        {records.data ? (
          <AttendanceTable
            rows={rows}
            canDelete={admin.role === 'superadmin'}
            emptyMessage="No hay registros con estos filtros."
            onReview={setReview}
            onEdit={record => setRecordModal({ open: true, record })}
            onDelete={setToDelete}
          />
        ) : records.loading ? (
          <PageLoader />
        ) : (
          <div className="p-6">
            <ErrorState message={records.error ?? ''} onRetry={records.reload} />
          </div>
        )}
      </SectionCard>

      <EvidenceReviewModal record={review} onClose={() => setReview(null)} onUpdated={replaceRow} />

      <RecordModal
        open={recordModal.open}
        record={recordModal.record}
        students={(students.data ?? []).filter(student => student.active)}
        onClose={() => setRecordModal(current => ({ ...current, open: false }))}
        onSaved={replaceRow}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar registro"
        confirmLabel="Eliminar definitivamente"
        message="Se eliminará el registro y sus fotografías de evidencia. Si la asistencia no es válida, es preferible invalidarla para conservar el historial."
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          await adminApi.deleteRecord(toDelete!.id);
          records.setData(rows.filter(r => r.id !== toDelete!.id));
          setToDelete(null);
          toast.notify('Registro eliminado.', 'success');
        }}
      />
    </>
  );
}
