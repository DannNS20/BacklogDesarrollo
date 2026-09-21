import { DoorOpen, LogOut, Plus, RotateCcw, UsersRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { GuestPass } from '../../../../shared/contracts';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { dateKey, formatDuration, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { Badge, EmptyState, ErrorState, PageHeader, PageLoader, PulseDot, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { staffApi } from '../api';
import { useStaffContext } from '../context';

export default function Guests() {
  const toast = useToast();
  const [date, setDate] = useState(dateKey(new Date()));
  const [issuing, setIssuing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const passes = useAsync(() => staffApi.guestPasses(date), [date], { pollMs: 30_000 });

  const run = async (id: string, action: () => Promise<GuestPass>, message: string) => {
    setBusyId(id);
    try {
      await action();
      toast.notify(message, 'success');
      void passes.reload();
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const list = passes.data ?? [];
  const inside = list.filter(pass => pass.insideSince).length;

  return (
    <>
      <PageHeader
        eyebrow="Visitantes"
        title="Pases de invitado"
        description="Registro de visitantes sin credencial institucional. Cada pase vale solo el día que se emite."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIssuing(true)}>
            Emitir pase
          </Button>
        }
      />

      <section className="card mb-5 flex flex-wrap items-end gap-4 p-4">
        <Field label="Día" className="w-48">
          <input type="date" className="input" value={date} max={dateKey(new Date())} onChange={event => setDate(event.target.value)} />
        </Field>
        <p className="text-sm text-stone-500">
          <b className="text-stone-800">{list.length}</b> pases emitidos · <b className="text-stone-800">{inside}</b> dentro del campus
        </p>
      </section>

      <SectionCard title="Pases del día" icon={UsersRound} description={date === dateKey(new Date()) ? 'Hoy' : date}>
        {!passes.data ? (
          passes.loading ? (
            <PageLoader />
          ) : (
            <div className="p-6">
              <ErrorState message={passes.error ?? ''} onRetry={passes.reload} />
            </div>
          )
        ) : list.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Sin pases ese día"
            description="Cuando vigilancia registre a un visitante, su pase aparecerá aquí."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIssuing(true)}>
                Emitir pase
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map(pass => (
              <li key={pass.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-stone-900">{pass.fullName}</p>
                    {pass.insideSince ? (
                      <Badge tone="verde">
                        <PulseDot />
                        Dentro desde {formatTime(pass.insideSince)} · {formatDuration(pass.minutesInside)}
                      </Badge>
                    ) : pass.status === 'cerrado' ? (
                      <Badge>Cerrado</Badge>
                    ) : pass.status === 'expirado' ? (
                      <Badge tone="amber">Expirado</Badge>
                    ) : (
                      <Badge tone="blue">Activo</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-600">{pass.reason}</p>
                  <p className="text-xs text-stone-500">
                    {pass.accessPointName}
                    {pass.document && ` · ${pass.document}`}
                    {pass.hostName && ` · visita a ${pass.hostName}`}
                    {pass.issuedByName && ` · emitió ${pass.issuedByName}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {pass.insideSince ? (
                    <Button
                      size="sm"
                      variant="accent"
                      icon={<LogOut className="size-3.5" />}
                      loading={busyId === pass.id}
                      onClick={() => run(pass.id, () => staffApi.closeGuestPass(pass.id), `Salida registrada: ${pass.fullName}.`)}
                    >
                      Registrar salida
                    </Button>
                  ) : (
                    pass.status !== 'cerrado' && (
                      <Button
                        size="sm"
                        icon={<RotateCcw className="size-3.5" />}
                        loading={busyId === pass.id}
                        onClick={() => run(pass.id, () => staffApi.reenterGuest(pass.id), `Reingreso registrado: ${pass.fullName}.`)}
                      >
                        Registrar reingreso
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <IssueModal
        open={issuing}
        onClose={() => setIssuing(false)}
        onIssued={() => {
          setDate(dateKey(new Date()));
          void passes.reload();
        }}
      />
    </>
  );
}

function IssueModal({ open, onClose, onIssued }: { open: boolean; onClose: () => void; onIssued: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Emitir pase de invitado" description="El pase registra la entrada y vence al terminar el día.">
      <IssueForm onClose={onClose} onIssued={onIssued} />
    </Modal>
  );
}

function IssueForm({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const toast = useToast();
  const { meta } = useStaffContext();
  const [values, setValues] = useState({ fullName: '', document: '', reason: '', hostName: '', accessPointId: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pass = await staffApi.issueGuestPass(values);
      toast.notify(`Pase emitido y entrada registrada: ${pass.fullName}.`, 'success');
      onIssued();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del visitante" required className="sm:col-span-2">
          <input className="input" value={values.fullName} onChange={event => set('fullName', event.target.value)} required />
        </Field>
        <Field label="Identificación" hint="INE, credencial de otra institución…">
          <input className="input" value={values.document} onChange={event => set('document', event.target.value)} placeholder="INE 1234" />
        </Field>
        <Field label="Persona o área que visita">
          <input className="input" value={values.hostName} onChange={event => set('hostName', event.target.value)} placeholder="Ej. Control Escolar" />
        </Field>
        <Field label="Acceso" required>
          <select className="input" value={values.accessPointId} onChange={event => set('accessPointId', event.target.value)} required>
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
        <Field label="Motivo de la visita" required>
          <input className="input" value={values.reason} onChange={event => set('reason', event.target.value)} placeholder="Ej. Trámite de titulación" required />
        </Field>
        <p className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500 sm:col-span-2">
          <DoorOpen className="size-4 shrink-0" />
          Al emitirlo se registra la entrada del visitante. Su salida se registra desde esta misma pantalla.
        </p>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          Emitir pase y registrar entrada
        </Button>
      </ModalFooter>
    </form>
  );
}
