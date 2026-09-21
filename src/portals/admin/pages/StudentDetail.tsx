import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Download,
  FolderOpen,
  KeyRound,
  Pencil,
  Plus,
  Printer,
  Target,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AttendanceRow } from '../../../../shared/contracts';
import { estimateCompletion } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import CountUp from '../../../components/reactbits/CountUp/CountUp';
import { ScheduleWeek } from '../../../components/ScheduleWeek';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { dateKey, formatDate, formatHours, formatTime, relativeTime, toHours } from '../../../lib/format';
import { Button, buttonStyles } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Avatar, Badge, ErrorState, PageLoader, ProgressRing, PulseDot, SectionCard } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';
import { AttendanceTable } from '../components/AttendanceTable';
import { StudentPasswordReset, type CredentialsRecipient } from '../components/CredentialsDialog';
import { EvidenceReviewModal } from '../components/EvidenceReviewModal';
import { PrintReport } from '../components/PrintReport';
import { RecordModal } from '../components/RecordModal';
import { useAdminContext } from '../context';

export default function StudentDetail() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { admin, refreshSummary } = useAdminContext();
  const student = useAsync(() => adminApi.student(id), [id]);
  const records = useAsync(() => adminApi.attendance({ studentId: id }), [id]);
  const [resetTarget, setResetTarget] = useState<CredentialsRecipient | null>(null);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [biometricConfirm, setBiometricConfirm] = useState(false);
  const [review, setReview] = useState<AttendanceRow | null>(null);
  const [recordModal, setRecordModal] = useState<{ open: boolean; record: AttendanceRow | null }>({ open: false, record: null });
  const [toDelete, setToDelete] = useState<AttendanceRow | null>(null);

  if (!student.data) return student.loading ? <PageLoader /> : <ErrorState message={student.error ?? ''} onRetry={student.reload} />;

  const s = student.data;
  const rows = records.data ?? [];
  const required = s.requiredHours * 60;
  const ratio = s.validMinutes / required;
  const remaining = Math.max(0, required - s.validMinutes);
  const estimated = estimateCompletion(remaining, s.schedule, new Date());
  const recipient: CredentialsRecipient = { id: s.id, name: s.fullName, email: s.email, code: s.code };

  const refreshAll = () => {
    void student.reload();
    void records.reload();
    refreshSummary();
  };

  const replaceRow = (row: AttendanceRow) => {
    records.setData(rows.some(r => r.id === row.id) ? rows.map(r => (r.id === row.id ? row : r)) : [row, ...rows]);
    void student.reload();
  };

  const exportCsv = () =>
    downloadCsv(`asistencia-${s.code}-${dateKey(new Date())}.csv`, [
      ['Fecha', 'Entrada', 'Salida', 'Minutos', 'Estado', 'Retardo (min)', 'Biometría', 'Ubicación', 'Origen', 'Notas', 'Observación de revisión'],
      ...rows.map(r => [
        dateKey(new Date(r.checkIn)),
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
      <div className="print:hidden">
        <Link to="/admin/prestadores" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ArrowLeft className="size-4" />
          Prestadores
        </Link>

        <section className="card overflow-hidden">
          <div className="brand-stripe h-1" />
          <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar name={s.fullName} size="xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-900">{s.fullName}</h1>
                  {s.inService && (
                    <Badge tone="verde">
                      <PulseDot />
                      En servicio
                    </Badge>
                  )}
                  {s.completedAt && <Badge tone="blue">Servicio completado</Badge>}
                  {!s.active && <Badge tone="red">Inactivo</Badge>}
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  <span className="font-mono font-semibold text-stone-700">{s.code}</span> · {s.email}
                </p>
                <p className="text-sm text-stone-500">
                  {s.career}
                  {s.program && ` · ${s.program}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/prestadores/${s.id}/editar`} className={buttonStyles('secondary')}>
                <Pencil className="size-4" />
                Editar
              </Link>
              <Button icon={<KeyRound className="size-4" />} onClick={() => setResetTarget(recipient)}>
                Nueva contraseña
              </Button>
              <Button icon={<Printer className="size-4" />} onClick={() => window.print()} disabled={!rows.length}>
                Reporte
              </Button>
              <Button variant={s.active ? 'danger' : 'primary'} icon={s.active ? <Ban className="size-4" /> : <CircleCheck className="size-4" />} onClick={() => setStatusConfirm(true)}>
                {s.active ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          </div>
        </section>

        {s.pendingResetRequestId && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-terracota-200 bg-terracota-50 px-4 py-3 sm:flex-row sm:items-center">
            <KeyRound className="size-5 shrink-0 text-terracota-600" />
            <p className="flex-1 text-sm text-terracota-800">
              <b>Solicitud de nueva contraseña pendiente.</b> El prestador indicó que no puede acceder a su portal.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={<X className="size-3.5" />}
                onClick={async () => {
                  try {
                    await adminApi.dismissResetRequest(s.pendingResetRequestId!);
                    toast.notify('Solicitud descartada.', 'info');
                    refreshAll();
                  } catch (err) {
                    toast.notify(errorMessage(err), 'error');
                  }
                }}
              >
                Descartar
              </Button>
              <Button size="sm" variant="accent" icon={<KeyRound className="size-3.5" />} onClick={() => setResetTarget(recipient)}>
                Generar contraseña
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <SectionCard title="Avance" icon={Target} bodyClassName="flex flex-col">
            <div className="flex items-center gap-5 p-5">
              <ProgressRing value={ratio} size={140} stroke={12}>
                <div>
                  <p className="font-display text-3xl leading-none font-extrabold text-stone-900">
                    <CountUp to={toHours(s.validMinutes)} duration={1.3} />
                  </p>
                  <p className="text-[11px] text-stone-500">de {s.requiredHours} h</p>
                </div>
              </ProgressRing>
              <dl className="space-y-2.5 text-sm">
                <Metric label="Avance" value={`${Math.min(100, Math.round(ratio * 100))}%`} />
                <Metric label="Horas restantes" value={formatHours(remaining)} />
                <Metric label="Jornadas válidas" value={String(s.sessions)} />
                <Metric label="Retardos" value={String(s.lateCount)} />
              </dl>
            </div>
            <p className="mt-auto flex items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-xs text-stone-600">
              <CalendarCheck className="size-4 shrink-0 text-verde-700" />
              {s.completedAt
                ? `Completó el ${formatDate(s.completedAt, 'long')}.`
                : estimated
                  ? `Término estimado: ${formatDate(estimated, 'long')}.`
                  : 'Sin horario para estimar la fecha de término.'}
            </p>
          </SectionCard>

          <SectionCard title="Horario asignado" icon={CalendarDays}>
            <ScheduleWeek schedule={s.schedule} />
          </SectionCard>

          <SectionCard title="Expediente" icon={FolderOpen}>
            <dl className="divide-y divide-stone-100 text-sm">
              <Row label="Responsable">{s.supervisorName ?? 'Coordinación'}</Row>
              <Row label="Fecha de inicio">{s.startDate ? formatDate(s.startDate) : '—'}</Row>
              <Row label="Registrado">{formatDate(s.createdAt)}</Row>
              <Row label="Último acceso">{s.lastLoginAt ? relativeTime(s.lastLoginAt) : 'Nunca ha ingresado'}</Row>
              <Row label="Biometría">
                {s.biometricDevices ? (
                  <span className="flex items-center justify-end gap-2">
                    {s.biometricDevices} {s.biometricDevices === 1 ? 'dispositivo' : 'dispositivos'}
                    <button type="button" onClick={() => setBiometricConfirm(true)} className="text-xs font-semibold text-red-600 hover:underline">
                      Quitar
                    </button>
                  </span>
                ) : (
                  'No vinculada'
                )}
              </Row>
            </dl>
          </SectionCard>
        </div>

        <SectionCard
          className="mt-5"
          title="Registros de asistencia"
          description={`${rows.length} registros · ${formatHours(s.validMinutes)} válidas`}
          icon={ClipboardList}
          action={
            <div className="flex gap-2">
              <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportCsv} disabled={!rows.length}>
                CSV
              </Button>
              <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setRecordModal({ open: true, record: null })}>
                Registro manual
              </Button>
            </div>
          }
        >
          {records.data ? (
            <AttendanceTable
              rows={rows}
              showStudent={false}
              canDelete={admin.role === 'superadmin'}
              emptyMessage="Este prestador aún no tiene registros de asistencia."
              onReview={setReview}
              onEdit={record => setRecordModal({ open: true, record })}
              onDelete={setToDelete}
            />
          ) : (
            <PageLoader />
          )}
        </SectionCard>
      </div>

      {records.data && <PrintReport student={s} records={rows} adminName={admin.fullName} />}

      <StudentPasswordReset student={resetTarget} onClose={() => setResetTarget(null)} onCompleted={() => void student.reload()} />

      <ConfirmDialog
        open={statusConfirm}
        title={s.active ? 'Desactivar prestador' : 'Reactivar prestador'}
        confirmLabel={s.active ? 'Desactivar' : 'Reactivar'}
        variant={s.active ? 'danger' : 'primary'}
        message={
          s.active
            ? 'No podrá iniciar sesión ni registrar asistencia. Su historial y horas se conservan y puedes reactivarlo en cualquier momento.'
            : 'Podrá volver a iniciar sesión con su contraseña actual y registrar asistencia.'
        }
        onCancel={() => setStatusConfirm(false)}
        onConfirm={async () => {
          student.setData(await adminApi.setStudentActive(s.id, !s.active));
          setStatusConfirm(false);
          toast.notify(s.active ? 'Prestador desactivado.' : 'Prestador reactivado.', 'success');
        }}
      />

      <ConfirmDialog
        open={biometricConfirm}
        title="Quitar biometría"
        confirmLabel="Quitar dispositivos"
        message="Úsalo si el prestador cambió de teléfono o perdió su dispositivo. Podrá vincular uno nuevo desde su perfil."
        onCancel={() => setBiometricConfirm(false)}
        onConfirm={async () => {
          student.setData(await adminApi.removeStudentBiometrics(s.id));
          setBiometricConfirm(false);
          toast.notify('Dispositivos biométricos eliminados.', 'success');
        }}
      />

      <EvidenceReviewModal record={review} onClose={() => setReview(null)} onUpdated={replaceRow} />

      <RecordModal
        open={recordModal.open}
        record={recordModal.record}
        students={[{ id: s.id, fullName: s.fullName, code: s.code }]}
        fixedStudentId={s.id}
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
          void student.reload();
          toast.notify('Registro eliminado.', 'success');
        }}
      />
    </>
  );
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[11px] text-stone-500">{label}</dt>
    <dd className="font-display font-bold text-stone-900">{value}</dd>
  </div>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-2.5">
    <dt className="text-stone-500">{label}</dt>
    <dd className="text-right font-medium text-stone-800">{children}</dd>
  </div>
);
