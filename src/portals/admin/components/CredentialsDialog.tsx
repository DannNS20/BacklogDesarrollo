import { Check, Copy, KeyRound, Mail, MailWarning, Send, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../../api/http';
import { copyText } from '../../../lib/clipboard';
import { Button, buttonStyles } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';
import { useAdminContext } from '../context';
import { credentialsEmail } from '../mailTemplates';

export interface CredentialsRecipient {
  id: string;
  name: string;
  email: string;
  code?: string;
}

interface CredentialsDialogProps {
  open: boolean;
  kind: 'student' | 'admin';
  mode: 'welcome' | 'reset';
  recipient: CredentialsRecipient | null;
  password: string | null;
  onClose: () => void;
}

/** Muestra la contraseña generada una sola vez y permite enviarla con un correo precargado */
export function CredentialsDialog(props: CredentialsDialogProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      locked
      size="lg"
      title={props.mode === 'welcome' ? 'Registro completado' : 'Nueva contraseña generada'}
      description={props.recipient ? `${props.recipient.name} · ${props.recipient.email}` : undefined}
    >
      {props.recipient && props.password && <CredentialsBody {...props} recipient={props.recipient} password={props.password} />}
    </Modal>
  );
}

function CredentialsBody({ kind, mode, recipient, password, onClose }: CredentialsDialogProps & { recipient: CredentialsRecipient; password: string }) {
  const toast = useToast();
  const { admin, meta } = useAdminContext();
  const template = credentialsEmail({
    kind,
    mode,
    name: recipient.name,
    email: recipient.email,
    code: recipient.code,
    password,
    portalUrl: meta?.portalUrl ?? window.location.origin,
    senderName: admin.fullName,
  });
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const copyPassword = async () => {
    if (await copyText(password)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const result =
        kind === 'student' ? await adminApi.emailStudent(recipient.id, subject, body) : await adminApi.emailAdmin(recipient.id, subject, body);
      setSent(true);
      toast.notify(
        result.delivered
          ? `Correo enviado a ${recipient.email}.`
          : 'SMTP no configurado: el correo se guardó en la bandeja local del servidor (server/data/outbox).',
        result.delivered ? 'success' : 'warning',
      );
    } catch (err) {
      toast.notify(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <ModalBody className="space-y-5">
        <div className="rounded-xl border border-verde-200 bg-verde-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-verde-800">
            <KeyRound className="size-4" />
            Contraseña de acceso
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-verde-200 bg-white px-4 py-2.5 font-mono text-xl font-semibold tracking-[0.12em] text-stone-900 select-all">
              {password}
            </code>
            <Button icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={copyPassword}>
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-verde-800">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            Por seguridad esta contraseña solo se muestra ahora. Envíala al correo institucional; si se pierde, genera una nueva.
          </p>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-stone-900">
            <Mail className="size-4 text-verde-700" />
            Correo con las credenciales
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Para">
              <input className="input" value={recipient.email} readOnly />
            </Field>
            <Field label="Asunto">
              <input className="input" value={subject} onChange={event => setSubject(event.target.value)} maxLength={200} />
            </Field>
          </div>
          <Field label="Mensaje" hint="Puedes ajustar el texto antes de enviarlo.">
            <textarea className="input min-h-64 font-mono text-[13px] leading-relaxed" value={body} onChange={event => setBody(event.target.value)} />
          </Field>
          {meta && !meta.smtpConfigured && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <MailWarning className="mt-0.5 size-4 shrink-0" />
              El servidor aún no tiene SMTP configurado. "Enviar" guardará el correo en la bandeja local; usa "Abrir en mi correo" para enviarlo desde
              tu cuenta institucional.
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <a
          href={`mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          className={buttonStyles('secondary', 'md', 'mr-auto')}
        >
          <Mail className="size-4" />
          Abrir en mi correo
        </a>
        <Button variant="ghost" onClick={onClose}>
          {sent ? 'Cerrar' : 'Cerrar sin enviar'}
        </Button>
        <Button variant="primary" icon={sent ? <Check className="size-4" /> : <Send className="size-4" />} loading={sending} onClick={send}>
          {sent ? 'Enviar de nuevo' : 'Enviar correo'}
        </Button>
      </ModalFooter>
    </>
  );
}

interface StudentPasswordResetProps {
  student: CredentialsRecipient | null;
  onClose: () => void;
  onCompleted?: () => void;
}

/** Confirmación → generación → envío de la nueva contraseña de un prestador */
export function StudentPasswordReset({ student, onClose, onCompleted }: StudentPasswordResetProps) {
  const { refreshSummary } = useAdminContext();
  const [password, setPassword] = useState<string | null>(null);
  const [target, setTarget] = useState<CredentialsRecipient | null>(null);

  const recipient = student ?? target;

  return (
    <>
      <ConfirmGenerate
        open={student !== null && password === null}
        name={student?.name ?? ''}
        onCancel={onClose}
        onConfirm={async () => {
          const result = await adminApi.resetStudentPassword(student!.id);
          setTarget(student);
          setPassword(result.password);
          refreshSummary();
          onCompleted?.();
        }}
      />
      <CredentialsDialog
        open={password !== null}
        kind="student"
        mode="reset"
        recipient={recipient}
        password={password}
        onClose={() => {
          setPassword(null);
          setTarget(null);
          onClose();
        }}
      />
    </>
  );
}

function ConfirmGenerate({ open, name, onCancel, onConfirm }: { open: boolean; name: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onCancel} size="sm" title="Generar nueva contraseña">
      <ModalBody className="space-y-3 text-sm text-stone-600">
        <p>
          Se generará una contraseña segura para <b className="text-stone-900">{name}</b>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-500">
          <li>La contraseña anterior dejará de funcionar de inmediato.</li>
          <li>Se cerrarán sus sesiones abiertas en otros dispositivos.</li>
          <li>Las solicitudes pendientes se marcarán como atendidas.</li>
        </ul>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon={<KeyRound className="size-4" />}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } catch (err) {
              toast.notify(errorMessage(err), 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          Generar contraseña
        </Button>
      </ModalFooter>
    </Modal>
  );
}
