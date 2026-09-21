import { Ban, CircleCheck, StickyNote } from 'lucide-react';
import { useState } from 'react';
import type { AttendanceRow } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { EvidencePanel } from '../../../components/Evidence';
import { RecordBadges } from '../../../components/RecordBadges';
import { capitalize, formatDate, formatDuration } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';

interface EvidenceReviewModalProps {
  record: AttendanceRow | null;
  onClose: () => void;
  onUpdated: (row: AttendanceRow) => void;
}

export function EvidenceReviewModal({ record, onClose, onUpdated }: EvidenceReviewModalProps) {
  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      size="xl"
      title="Revisión de evidencia"
      description={record ? `${record.studentName} (${record.studentCode}) · ${capitalize(formatDate(record.checkIn, 'long'))}` : undefined}
    >
      {record && <ReviewBody key={record.id} record={record} onClose={onClose} onUpdated={onUpdated} />}
    </Modal>
  );
}

function ReviewBody({ record, onClose, onUpdated }: { record: AttendanceRow; onClose: () => void; onUpdated: (row: AttendanceRow) => void }) {
  const toast = useToast();
  const [note, setNote] = useState(record.reviewNote);
  const [busy, setBusy] = useState(false);
  const rejected = record.status === 'rejected';

  const review = async (status: 'valid' | 'rejected') => {
    if (status === 'rejected' && note.trim().length < 5) {
      toast.notify('Escribe el motivo por el que se invalida el registro.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const updated = await adminApi.reviewRecord(record.id, status, note);
      onUpdated(updated);
      toast.notify(status === 'valid' ? 'Registro marcado como válido.' : 'Registro invalidado: sus horas ya no cuentan.', 'success');
      onClose();
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalBody className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <EvidencePanel title="Entrada" at={record.checkIn} src={adminApi.evidenceUrl(record.id, 'in')} evidence={record.checkInEvidence} />
          <EvidencePanel
            title="Salida"
            at={record.checkOut}
            src={record.checkOut ? adminApi.evidenceUrl(record.id, 'out') : null}
            evidence={record.checkOutEvidence}
          />
        </div>

        <div className="grid gap-4 rounded-xl border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-stone-500">Duración</p>
            <p className="font-display text-lg font-bold text-stone-900">{record.checkOut ? formatDuration(record.minutes) : 'En curso / sin salida'}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Origen</p>
            <p className="font-semibold text-stone-800">{record.source === 'portal' ? 'Portal del estudiante' : 'Captura manual'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-stone-500">Indicadores</p>
            <div className="flex flex-wrap gap-1">
              <RecordBadges record={record} />
            </div>
          </div>
          {record.notes && (
            <p className="flex items-start gap-2 text-sm text-stone-600 sm:col-span-3">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-stone-400" />
              {record.notes}
            </p>
          )}
        </div>

        <Field
          label={rejected ? 'Motivo de invalidación' : 'Observación de la revisión'}
          hint={rejected ? 'Visible para el estudiante en su historial.' : 'Obligatoria si invalidas el registro. El estudiante podrá verla.'}
        >
          <textarea
            className="input resize-none"
            rows={2}
            maxLength={500}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Ej. La fotografía no corresponde al prestador."
          />
        </Field>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} className="mr-auto">
          Cerrar
        </Button>
        {rejected ? (
          <Button variant="primary" icon={<CircleCheck className="size-4" />} loading={busy} onClick={() => review('valid')}>
            Marcar como válido
          </Button>
        ) : (
          <>
            {note !== record.reviewNote && (
              <Button loading={busy} onClick={() => review('valid')}>
                Guardar observación
              </Button>
            )}
            <Button variant="danger" icon={<Ban className="size-4" />} loading={busy} onClick={() => review('rejected')}>
              Invalidar registro
            </Button>
          </>
        )}
      </ModalFooter>
    </>
  );
}
