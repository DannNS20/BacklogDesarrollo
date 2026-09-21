import { CalendarDays, Camera, Clock3, GraduationCap, TriangleAlert, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/http';
import { AuthShell } from '../../../brand/AuthShell';
import { Button } from '../../../ui/Button';
import { FullPageLoader } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { IconInput, PasswordInput } from '../../../ui/Inputs';
import { useSession } from '../session';

export default function StudentLogin() {
  const { status, expired, signIn } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/estudiante';
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn({ identifier, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      portal="student"
      badge="Portal del Estudiante"
      badgeIcon={GraduationCap}
      title="Tu servicio social, en orden y sin papel"
      description="Registra tu asistencia con evidencia y consulta en todo momento cuánto llevas y cuánto te falta."
      highlights={[
        { icon: Camera, text: 'Entrada y salida con fotografía y biometría' },
        { icon: Clock3, text: 'Horas cumplidas, restantes y fecha estimada de término' },
        { icon: CalendarDays, text: 'Tu horario asignado siempre a la mano' },
      ]}
    >
      <div className="p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-verde-600 text-white">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <p className="eyebrow text-verde-700">Portal del Estudiante</p>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">Iniciar sesión</h1>
          </div>
        </div>

        {expired && (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Tu sesión se cerró. Si la Coordinación generó una contraseña nueva, úsala para ingresar.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Código de estudiante o correo institucional">
            <IconInput
              icon={UserRound}
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              placeholder="219345671 o nombre@alumnos.udg.mx"
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Contraseña">
            <PasswordInput value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
          </Field>
          <FormError message={error} />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Ingresar
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/estudiante/recuperar" className="text-sm font-semibold text-verde-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="mt-6 rounded-lg bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          Tu contraseña la genera la Coordinación de Servicio Social al registrarte. ¿Eres responsable de área?{' '}
          <Link to="/admin/acceso" className="font-semibold text-terracota-600 hover:underline">
            Ir al portal administrativo
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
