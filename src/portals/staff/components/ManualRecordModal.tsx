import { useState, type FormEvent } from 'react';
import type { AccessDirection, AccessRecord } from '../../../../shared/contracts';
import { PERSON_ROLE_LABELS } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { Button } from '../../../ui/Button';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

interface ManualRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (record: AccessRecord) => void;
}

/** Respaldo de la caseta cuando el dispositivo de la persona no puede registrar */
export function ManualRecordModal(props: ManualRecordModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Registro manual en caseta"
      description="Úsalo cuando la persona no pueda registrar desde su celular."
    >
      <Form {...props} />
    </Modal>
  );
}

function Form({ onClose, onSaved }: ManualRecordModalProps) {
  const toast = useToast();
  const { meta } = useStaffContext();
  const people = useAsync(() => staffApi.peopleLookup(), []);
  const [personId, setPersonId] = useState('');
  const [accessPointId, setAccessPointId] = useState('');
  const [direction, setDirection] = useState<AccessDirection>('in');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const record = await staffApi.manualRecord({ personId, accessPointId, direction, notes });
      onSaved(record);
      toast.notify(direction === 'in' ? 'Entrada registrada en caseta.' : 'Salida registrada en caseta.', 'success');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Persona" required className="sm:col-span-2">
          <select className="input" value={personId} onChange={event => setPersonId(event.target.value)} required>
            <option value="">Selecciona…</option>
            {(people.data ?? [])
              .filter(person => person.active)
              .map(person => (
                <option key={person.id} value={person.id}>
                  {person.fullName} · {person.code} · {PERSON_ROLE_LABELS[person.role]}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Acceso" required>
          <select className="input" value={accessPointId} onChange={event => setAccessPointId(event.target.value)} required>
            <option value="">Selecciona…</option>
            {(meta?.accessPoints ?? [])
              .filter(point => point.active)
              .map(point => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Movimiento" required>
          <select className="input" value={direction} onChange={event => setDirection(event.target.value as AccessDirection)}>
            <option value="in">Entrada</option>
            <option value="out">Salida</option>
          </select>
        </Field>
        <Field label="Motivo" required className="sm:col-span-2" hint="Queda en la bitácora junto con tu nombre.">
          <textarea
            className="input resize-none"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Ej. El teléfono del alumno se quedó sin batería."
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
          Registrar
        </Button>
      </ModalFooter>
    </form>
  );
}
