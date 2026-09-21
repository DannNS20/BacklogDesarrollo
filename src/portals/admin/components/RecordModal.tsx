import { useState, type FormEvent } from 'react';
import type { AttendanceRow } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { formatDuration, fromLocalInput, toLocalInput } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';

interface StudentOption {
  id: string;
  fullName: string;
  code: string;
}

interface RecordModalProps {
  open: boolean;
  record: AttendanceRow | null;
  students: StudentOption[];
  fixedStudentId?: string;
  onClose: () => void;
  onSaved: (row: AttendanceRow) => void;
}

/** Captura manual o corrección de un registro (queda en bitácora) */
export function RecordModal(props: RecordModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.record ? 'Corregir registro' : 'Registro manual de asistencia'}
      description={props.record ? `${props.record.studentName} (${props.record.studentCode})` : 'Úsalo para asistencias que no se registraron en el portal.'}
    >
      <RecordForm {...props} />
    </Modal>
  );
}

function defaultCheckIn() {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

function RecordForm({ record, students, fixedStudentId, onClose, onSaved }: RecordModalProps) {
  const toast = useToast();
  const [studentId, setStudentId] = useState(record?.studentId ?? fixedStudentId ?? '');
  const [checkIn, setCheckIn] = useState(toLocalInput(record?.checkIn ?? defaultCheckIn()));
  const [checkOut, setCheckOut] = useState(record?.checkOut ? toLocalInput(record.checkOut) : '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview =
    checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
      ? formatDuration(Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000))
      : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (notes.trim().length < 5) {
      setError('Describe el motivo de la captura o corrección (mínimo 5 caracteres).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { checkIn: fromLocalInput(checkIn), checkOut: checkOut ? fromLocalInput(checkOut) : null, notes };
      const saved = record ? await adminApi.updateRecord(record.id, input) : await adminApi.createRecord({ ...input, studentId });
      onSaved(saved);
      toast.notify(record ? 'Registro corregido.' : 'Registro manual agregado.', 'success');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        {!record && !fixedStudentId && (
          <Field label="Prestador" required className="sm:col-span-2">
            <select className="input" value={studentId} onChange={event => setStudentId(event.target.value)} required>
              <option value="">Selecciona un prestador…</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName} · {student.code}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Entrada" required>
          <input type="datetime-local" className="input" value={checkIn} onChange={event => setCheckIn(event.target.value)} required />
        </Field>
        <Field label="Salida" hint={preview ? `Duración: ${preview}` : 'Déjala vacía si aún no registra salida.'}>
          <input type="datetime-local" className="input" value={checkOut} onChange={event => setCheckOut(event.target.value)} />
        </Field>
        <Field label="Motivo" required className="sm:col-span-2" hint="Queda registrado en la bitácora junto con tu nombre.">
          <textarea
            className="input resize-none"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Ej. Olvidó registrar su salida; confirmado por el responsable del área."
          />
        </Field>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {record ? 'Guardar corrección' : 'Agregar registro'}
        </Button>
      </ModalFooter>
    </form>
  );
}
