import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import { CalendarDays, Fingerprint, IdCard, KeyRound, Plus, ShieldCheck, Smartphone, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { BiometricCredential } from '../../../../shared/contracts';
import { ApiError, errorMessage } from '../../../api/http';
import { ScheduleWeek } from '../../../components/ScheduleWeek';
import { useAsync } from '../../../hooks/useAsync';
import { deviceLabel } from '../../../lib/camera';
import { formatDate, relativeTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { Avatar, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Field } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { studentApi } from '../api';

export default function StudentProfile() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => studentApi.overview(), []);
  const [requesting, setRequesting] = useState(false);

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;
  const { profile } = data;

  const requestPassword = async () => {
    setRequesting(true);
    try {
      await studentApi.requestPasswordReset({ code: profile.code, email: profile.email, message: 'Solicitud enviada desde Mi perfil.' });
      toast.notify('Solicitud enviada. La Coordinación te enviará una contraseña nueva a tu correo.', 'success');
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title="Perfil y seguridad" description="Tus datos registrados en la Coordinación de Servicio Social." />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <SectionCard title="Datos del prestador" icon={IdCard}>
            <div className="flex items-center gap-4 border-b border-stone-100 px-5 py-4">
              <Avatar name={profile.fullName} size="xl" />
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold text-stone-900">{profile.fullName}</p>
                <p className="font-mono text-sm text-stone-500">{profile.code}</p>
              </div>
            </div>
            <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2">
              <Info label="Correo institucional">{profile.email}</Info>
              <Info label="Carrera">{profile.career}</Info>
              <Info label="Área o programa">{profile.program || '—'}</Info>
              <Info label="Horas requeridas">{profile.requiredHours} h</Info>
              <Info label="Fecha de inicio">{profile.startDate ? formatDate(profile.startDate, 'long') : '—'}</Info>
              <Info label="Responsable">
                {profile.supervisorName ? (
                  <>
                    {profile.supervisorName}
                    <a href={`mailto:${profile.supervisorEmail}`} className="block text-xs text-verde-700 hover:underline">
                      {profile.supervisorEmail}
                    </a>
                  </>
                ) : (
                  'Coordinación de Servicio Social'
                )}
              </Info>
            </dl>
            <p className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-xs text-stone-500">
              <UserCog className="size-4 shrink-0" />
              Si algún dato es incorrecto, solicita la corrección a tu responsable o a la Coordinación.
            </p>
          </SectionCard>

          <BiometricsCard onChange={reload} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Horario asignado" icon={CalendarDays}>
            <ScheduleWeek schedule={data.schedule} />
          </SectionCard>

          <SectionCard title="Contraseña" icon={KeyRound}>
            <div className="space-y-3 px-5 py-4 text-sm text-stone-600">
              <p>
                Por seguridad, las contraseñas solo las genera la Coordinación. Si crees que alguien conoce la tuya o la perdiste, solicita una
                nueva y te llegará a <b className="text-stone-800">{profile.email}</b>.
              </p>
              <Button icon={<KeyRound className="size-4" />} loading={requesting} onClick={requestPassword}>
                Solicitar nueva contraseña
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-stone-500">{label}</dt>
    <dd className="mt-0.5 text-sm font-semibold break-words text-stone-800">{children}</dd>
  </div>
);

function BiometricsCard({ onChange }: { onChange: () => unknown }) {
  const toast = useToast();
  const supported = browserSupportsWebAuthn();
  const [platformReady, setPlatformReady] = useState<boolean | null>(null);
  const { data, loading, setData } = useAsync(() => studentApi.biometrics(), []);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState(deviceLabel());
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<BiometricCredential | null>(null);

  useEffect(() => {
    const check = window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (!check) {
      setPlatformReady(false);
      return;
    }
    check
      .call(window.PublicKeyCredential)
      .then(setPlatformReady)
      .catch(() => setPlatformReady(false));
  }, []);

  const register = async () => {
    setBusy(true);
    try {
      const optionsJSON = await studentApi.registrationOptions();
      const response = await startRegistration({ optionsJSON });
      setData(await studentApi.registerBiometric(response, label));
      setAdding(false);
      onChange();
      toast.notify('Biometría vinculada. Se te pedirá al registrar tu asistencia.', 'success');
    } catch (err) {
      const name = (err as Error).name;
      const message =
        err instanceof ApiError
          ? err.message
          : name === 'InvalidStateError'
            ? 'Este dispositivo ya está vinculado a tu cuenta.'
            : name === 'NotAllowedError'
              ? 'Se canceló la vinculación o expiró el tiempo.'
              : 'No se pudo vincular la biometría en este dispositivo.';
      toast.notify(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Verificación biométrica"
      description="Huella o reconocimiento facial de tu dispositivo"
      icon={Fingerprint}
      action={
        supported && (
          <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            Vincular
          </Button>
        )
      }
    >
      <div className="px-5 py-4 text-sm text-stone-600">
        <p>
          Al vincular tu dispositivo, cada registro podrá confirmarse con tu huella o rostro. Tus datos biométricos nunca salen de tu teléfono o
          computadora: el sistema solo guarda una llave de verificación.
        </p>
        {!supported && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Este navegador no admite verificación biométrica. Usa un navegador actualizado (Chrome, Safari o Edge) con conexión segura.
          </p>
        )}
        {supported && platformReady === false && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No detectamos lector de huella o cámara facial en este dispositivo. Puedes intentarlo desde tu celular.
          </p>
        )}
      </div>

      {loading && !data ? null : data && data.length > 0 ? (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {data.map(credential => (
            <li key={credential.id} className="flex items-center gap-3 px-5 py-3">
              <span className="grid size-9 place-items-center rounded-lg bg-verde-50 text-verde-700">
                <Smartphone className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-800">{credential.label}</p>
                <p className="text-xs text-stone-500">
                  Vinculado {formatDate(credential.createdAt)} · {credential.lastUsedAt ? `último uso ${relativeTime(credential.lastUsedAt)}` : 'sin usar'}
                </p>
              </div>
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setToRemove(credential)} aria-label="Quitar dispositivo" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
          <ShieldCheck className="size-4" />
          Aún no tienes dispositivos vinculados.
        </p>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} size="sm" title="Vincular este dispositivo" description="Tu dispositivo te pedirá tu huella, rostro o PIN.">
        <ModalBody>
          <Field label="Nombre del dispositivo" hint="Para identificarlo si después quieres quitarlo.">
            <input className="input" value={label} maxLength={60} onChange={event => setLabel(event.target.value)} />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
          <Button variant="primary" icon={<Fingerprint className="size-4" />} loading={busy} onClick={register}>
            Vincular biometría
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog
        open={toRemove !== null}
        title="Quitar dispositivo"
        confirmLabel="Quitar"
        message={`Ya no podrás verificar tus registros con "${toRemove?.label}".`}
        onCancel={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          setData(await studentApi.removeBiometric(toRemove.id));
          setToRemove(null);
          onChange();
          toast.notify('Dispositivo desvinculado.', 'success');
        }}
      />
    </SectionCard>
  );
}
