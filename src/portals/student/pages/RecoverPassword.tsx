import { ArrowLeft, BellRing, Hash, KeyRound, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { AuthShell } from '../../../brand/AuthShell';
import { onlyDigits } from '../../../lib/text';
import { Button, buttonStyles } from '../../../ui/Button';
import { Field, FormError } from '../../../ui/Field';
import { IconInput } from '../../../ui/Inputs';
import { studentApi } from '../api';

export default function RecoverPassword() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await studentApi.requestPasswordReset({ code, email, message });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      portal="student"
      badge="Recuperación de acceso"
      badgeIcon={KeyRound}
      title="Solicita una nueva contraseña"
      description="Por seguridad, solo la Coordinación puede generar contraseñas. Tu solicitud le llegará como notificación."
      highlights={[
        { icon: BellRing, text: 'La Coordinación recibe tu solicitud al instante' },
        { icon: ShieldCheck, text: 'Se genera una contraseña nueva y segura' },
        { icon: MailCheck, text: 'La recibes en tu correo institucional' },
      ]}
    >
      <div className="p-7 sm:p-8">
        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
              className="mx-auto grid size-16 place-items-center rounded-full bg-verde-50 text-verde-700 ring-8 ring-verde-50/60"
            >
              <MailCheck className="size-8" />
            </motion.span>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-stone-900">Solicitud enviada</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Si los datos coinciden con tu registro, la Coordinación generará una contraseña nueva y la enviará a{' '}
              <b className="text-stone-800">{email}</b>. Revisa también tu carpeta de correo no deseado.
            </p>
            <Link to="/estudiante/acceso" className={buttonStyles('primary', 'lg', 'mt-6 w-full')}>
              Volver a iniciar sesión
            </Link>
          </motion.div>
        ) : (
          <>
            <Link to="/estudiante/acceso" className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
              <ArrowLeft className="size-4" />
              Iniciar sesión
            </Link>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-stone-900">Recuperar acceso</h1>
            <p className="mt-1 text-sm text-stone-500">Confirma tus datos tal como están registrados en la Coordinación.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Código de estudiante" required>
                <IconInput
                  icon={Hash}
                  value={code}
                  onChange={event => setCode(onlyDigits(event.target.value, 10))}
                  inputMode="numeric"
                  placeholder="219345671"
                  className="font-mono"
                  required
                />
              </Field>
              <Field label="Correo institucional" required>
                <IconInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="nombre.apellido@alumnos.udg.mx"
                  required
                />
              </Field>
              <Field label="Mensaje para la Coordinación" hint="Opcional. Máximo 300 caracteres.">
                <textarea
                  className="input resize-none"
                  rows={2}
                  maxLength={300}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder="Ej. Perdí la contraseña que me enviaron."
                />
              </Field>
              <FormError message={error} />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Enviar solicitud
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
