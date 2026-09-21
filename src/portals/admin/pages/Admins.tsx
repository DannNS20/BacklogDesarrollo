import { Ban, CircleCheck, KeyRound, Pencil, ShieldCheck, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminInput, AdminListItem, AdminRole } from '../../../../shared/contracts';
import { INSTITUTIONAL_EMAIL_RE } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import { useAsync } from '../../../hooks/useAsync';
import { relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Avatar, Badge, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';
import { CredentialsDialog, type CredentialsRecipient } from '../components/CredentialsDialog';
import { useAdminContext } from '../context';

interface Credentials {
  recipient: CredentialsRecipient;
  password: string;
  mode: 'welcome' | 'reset';
}

export default function Admins() {
  const toast = useToast();
  const { admin: me } = useAdminContext();
  const list = useAsync(() => adminApi.admins(), []);
  const [form, setForm] = useState<{ open: boolean; admin: AdminListItem | null }>({ open: false, admin: null });
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminListItem | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminListItem | null>(null);

  if (!list.data) return list.loading ? <PageLoader /> : <ErrorState message={list.error ?? ''} onRetry={list.reload} />;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Responsables del sistema"
        description="Solo los correos institucionales registrados aquí pueden acceder al portal administrativo."
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setForm({ open: true, admin: null })}>
            Registrar responsable
          </Button>
        }
      />

      <SectionCard title="Cuentas con acceso" description={`${list.data.length} registradas`} icon={ShieldCheck}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                <th className="px-5 py-2.5">Responsable</th>
                <th className="px-5 py-2.5">Área</th>
                <th className="px-5 py-2.5">Rol</th>
                <th className="px-5 py-2.5">Prestadores</th>
                <th className="px-5 py-2.5">Último acceso</th>
                <th className="px-5 py-2.5">Estado</th>
                <th className="px-5 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {list.data.map(item => (
                <tr key={item.id} className="hover:bg-stone-50/80">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={item.fullName} />
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800">
                          {item.fullName}
                          {item.id === me.id && <span className="ml-1.5 text-xs font-normal text-stone-400">(tú)</span>}
                        </p>
                        <p className="text-xs text-stone-500">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{item.area || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone={item.role === 'superadmin' ? 'terracota' : 'neutral'}>{item.role === 'superadmin' ? 'Administrador general' : 'Responsable'}</Badge>
                  </td>
                  <td className="px-5 py-3 font-semibold text-stone-700">{item.studentCount}</td>
                  <td className="px-5 py-3 text-stone-600">{item.lastLoginAt ? relativeTime(item.lastLoginAt) : 'Nunca'}</td>
                  <td className="px-5 py-3">{item.active ? <Badge tone="verde">Activo</Badge> : <Badge tone="red">Inactivo</Badge>}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setForm({ open: true, admin: item })} aria-label="Editar" />
                    <Button size="sm" variant="ghost" icon={<KeyRound className="size-3.5" />} onClick={() => setResetTarget(item)} aria-label="Nueva contraseña" />
                    {item.id !== me.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={item.active ? <Ban className="size-3.5 text-red-600" /> : <CircleCheck className="size-3.5 text-verde-600" />}
                        onClick={() => setStatusTarget(item)}
                        aria-label={item.active ? 'Desactivar' : 'Reactivar'}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <AdminFormModal
        open={form.open}
        admin={form.admin}
        onClose={() => setForm(current => ({ ...current, open: false }))}
        onCreated={(created, password) => {
          setCredentials({ recipient: { id: created.id, name: created.fullName, email: created.email }, password, mode: 'welcome' });
          void list.reload();
        }}
        onUpdated={() => void list.reload()}
      />

      <CredentialsDialog
        open={credentials !== null}
        kind="admin"
        mode={credentials?.mode ?? 'welcome'}
        recipient={credentials?.recipient ?? null}
        password={credentials?.password ?? null}
        onClose={() => setCredentials(null)}
      />

      <ConfirmDialog
        open={resetTarget !== null}
        title="Generar nueva contraseña"
        variant="primary"
        confirmLabel="Generar contraseña"
        message={
          resetTarget?.id === me.id
            ? 'Se generará una contraseña nueva para tu cuenta. Todas tus sesiones se cerrarán: guárdala antes de continuar.'
            : `La contraseña actual de ${resetTarget?.fullName} dejará de funcionar y se cerrarán sus sesiones.`
        }
        onCancel={() => setResetTarget(null)}
        onConfirm={async () => {
          const target = resetTarget!;
          const { password } = await adminApi.resetAdminPassword(target.id);
          setResetTarget(null);
          setCredentials({ recipient: { id: target.id, name: target.fullName, email: target.email }, password, mode: 'reset' });
        }}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.active ? 'Desactivar responsable' : 'Reactivar responsable'}
        variant={statusTarget?.active ? 'danger' : 'primary'}
        confirmLabel={statusTarget?.active ? 'Desactivar' : 'Reactivar'}
        message={
          statusTarget?.active
            ? `${statusTarget?.fullName} ya no podrá ingresar. Sus prestadores seguirán asignados y podrás reasignarlos.`
            : `${statusTarget?.fullName} podrá volver a ingresar al portal administrativo.`
        }
        onCancel={() => setStatusTarget(null)}
        onConfirm={async () => {
          await adminApi.setAdminActive(statusTarget!.id, !statusTarget!.active);
          toast.notify(statusTarget!.active ? 'Responsable desactivado.' : 'Responsable reactivado.', 'success');
          setStatusTarget(null);
          void list.reload();
        }}
      />
    </>
  );
}

interface AdminFormModalProps {
  open: boolean;
  admin: AdminListItem | null;
  onClose: () => void;
  onCreated: (admin: { id: string; fullName: string; email: string }, password: string) => void;
  onUpdated: () => void;
}

function AdminFormModal(props: AdminFormModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.admin ? 'Editar responsable' : 'Registrar responsable'}
      description="El correo institucional será su usuario de acceso. La contraseña se genera automáticamente."
    >
      <AdminForm {...props} />
    </Modal>
  );
}

function AdminForm({ admin, onClose, onCreated, onUpdated }: AdminFormModalProps) {
  const toast = useToast();
  const [values, setValues] = useState<AdminInput>({
    email: admin?.email ?? '',
    fullName: admin?.fullName ?? '',
    area: admin?.area ?? '',
    role: admin?.role ?? 'responsable',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!INSTITUTIONAL_EMAIL_RE.test(values.email.trim())) {
      setError('Usa un correo institucional de la UdeG.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (admin) {
        await adminApi.updateAdmin(admin.id, values);
        toast.notify('Responsable actualizado.', 'success');
        onUpdated();
      } else {
        const { admin: created, password } = await adminApi.createAdmin(values);
        onCreated(created, password);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" required className="sm:col-span-2">
          <input className="input" value={values.fullName} onChange={event => setValues({ ...values, fullName: event.target.value })} required />
        </Field>
        <Field label="Correo institucional" required className="sm:col-span-2">
          <input className="input" type="email" value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} placeholder="nombre.apellido@udg.mx" required />
        </Field>
        <Field label="Área o dependencia">
          <input className="input" value={values.area} onChange={event => setValues({ ...values, area: event.target.value })} placeholder="Ej. Biblioteca" />
        </Field>
        <Field label="Rol" hint={values.role === 'superadmin' ? 'Acceso total, incluida esta sección.' : 'Solo ve a los prestadores que tiene asignados.'}>
          <select className="input" value={values.role} onChange={event => setValues({ ...values, role: event.target.value as AdminRole })}>
            <option value="responsable">Responsable de área</option>
            <option value="superadmin">Administrador general</option>
          </select>
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
          {admin ? 'Guardar cambios' : 'Registrar y generar contraseña'}
        </Button>
      </ModalFooter>
    </form>
  );
}
