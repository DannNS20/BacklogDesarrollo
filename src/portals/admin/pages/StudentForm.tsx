import { ArrowLeft, CalendarRange, IdCard, KeyRound, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ScheduleSlot, StudentDetail, StudentInput } from '../../../../shared/contracts';
import { DEFAULT_REQUIRED_HOURS, INSTITUTIONAL_EMAIL_RE, toMinutes, weeklyMinutes } from '../../../../shared/rules';
import { errorMessage } from '../../../api/http';
import Stepper, { Step } from '../../../components/reactbits/Stepper/Stepper';
import { ScheduleWeek } from '../../../components/ScheduleWeek';
import { useAsync } from '../../../hooks/useAsync';
import { dateKey, formatDate } from '../../../lib/format';
import { onlyDigits } from '../../../lib/text';
import { ErrorState, PageHeader, PageLoader } from '../../../ui/Display';
import { Field, FormError } from '../../../ui/Field';
import { useToast } from '../../../ui/toast';
import { adminApi } from '../api';
import { CredentialsDialog } from '../components/CredentialsDialog';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { useAdminContext } from '../context';

interface FormState {
  code: string;
  fullName: string;
  email: string;
  career: string;
  program: string;
  requiredHours: string;
  startDate: string;
  supervisorId: string;
  schedule: ScheduleSlot[];
}

type Errors = Partial<Record<keyof FormState, string>>;

export default function StudentForm() {
  const { id } = useParams();
  const existing = useAsync(() => (id ? adminApi.student(id) : Promise.resolve(null)), [id]);

  if (id && !existing.data) return existing.loading ? <PageLoader /> : <ErrorState message={existing.error ?? ''} onRetry={existing.reload} />;
  return <StudentFormInner key={id ?? 'nuevo'} initial={existing.data ?? null} />;
}

function StudentFormInner({ initial }: { initial: StudentDetail | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { admin, meta } = useAdminContext();
  const editing = initial !== null;

  const [form, setForm] = useState<FormState>(() => ({
    code: initial?.code ?? '',
    fullName: initial?.fullName ?? '',
    email: initial?.email ?? '',
    career: initial?.career ?? '',
    program: initial?.program ?? (admin.role === 'responsable' ? admin.area : ''),
    requiredHours: String(initial?.requiredHours ?? DEFAULT_REQUIRED_HOURS),
    startDate: initial?.startDate ?? dateKey(new Date()),
    supervisorId: initial?.supervisorId ?? (admin.role === 'responsable' ? admin.id : ''),
    schedule: initial?.schedule ?? [],
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ student: StudentDetail; password: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };

  const validate = (step: number): boolean => {
    const next: Errors = {};
    if (step === 1) {
      if (!/^\d{7,10}$/.test(form.code)) next.code = 'El código debe tener entre 7 y 10 dígitos.';
      if (form.fullName.trim().length < 5) next.fullName = 'Escribe el nombre completo (nombre y apellidos).';
      if (!INSTITUTIONAL_EMAIL_RE.test(form.email.trim())) next.email = 'Usa el correo institucional (@alumnos.udg.mx).';
      if (form.career.trim().length < 3) next.career = 'Indica la carrera.';
    }
    if (step === 2) {
      const hours = Number(form.requiredHours);
      if (!Number.isInteger(hours) || hours < 1 || hours > 2000) next.requiredHours = 'Indica un número entero de horas (1 a 2000).';
      if (!form.schedule.length) next.schedule = 'Asigna al menos un día de servicio.';
      else if (form.schedule.some(slot => toMinutes(slot.end) <= toMinutes(slot.start))) next.schedule = 'En cada día, la salida debe ser posterior a la entrada.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate(1) || !validate(2)) {
      toast.notify('Revisa los datos marcados en los pasos anteriores.', 'warning');
      return;
    }
    const input: StudentInput = {
      code: form.code,
      fullName: form.fullName,
      email: form.email.trim().toLowerCase(),
      career: form.career,
      program: form.program,
      requiredHours: Number(form.requiredHours),
      startDate: form.startDate || null,
      supervisorId: form.supervisorId || null,
      schedule: form.schedule,
    };
    setSaving(true);
    setSubmitError(null);
    try {
      if (initial) {
        const updated = await adminApi.updateStudent(initial.id, input);
        toast.notify('Datos del prestador actualizados.', 'success');
        navigate(`/admin/prestadores/${updated.id}`);
      } else {
        setCreated(await adminApi.createStudent(input));
      }
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const weekly = weeklyMinutes(form.schedule);
  const weeks = weekly ? Math.ceil((Number(form.requiredHours) * 60) / weekly) : null;
  const supervisorName = meta?.supervisors.find(item => item.id === form.supervisorId)?.fullName;

  return (
    <>
      <Link to={initial ? `/admin/prestadores/${initial.id}` : '/admin/prestadores'} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" />
        {initial ? initial.fullName : 'Prestadores'}
      </Link>
      <PageHeader
        eyebrow={editing ? 'Actualizar expediente' : 'Alta de prestador'}
        title={editing ? 'Editar prestador' : 'Registrar prestador de servicio social'}
        description={
          editing
            ? 'Los cambios de horario aplican a partir de hoy; los registros anteriores no se modifican.'
            : 'Captura los datos del estudiante y su horario. La contraseña de acceso se genera automáticamente.'
        }
      />

      <div className="mx-auto max-w-3xl">
        <Stepper
          stepLabels={['Datos del estudiante', 'Servicio y horario', 'Confirmación']}
          canProceed={validate}
          onFinalStepCompleted={submit}
          completing={saving}
          completeButtonText={editing ? 'Guardar cambios' : 'Registrar y generar contraseña'}
        >
          <Step>
            <div className="mb-5 flex items-center gap-2 font-display text-base font-bold text-stone-900">
              <IdCard className="size-5 text-verde-700" />
              Datos del estudiante
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código de estudiante" required error={errors.code}>
                <input className="input font-mono" inputMode="numeric" value={form.code} onChange={event => set('code', onlyDigits(event.target.value, 10))} placeholder="219345671" />
              </Field>
              <Field label="Correo institucional" required error={errors.email}>
                <input className="input" type="email" value={form.email} onChange={event => set('email', event.target.value)} placeholder="nombre.apellido@alumnos.udg.mx" />
              </Field>
              <Field label="Nombre completo" required error={errors.fullName} className="sm:col-span-2">
                <input className="input" value={form.fullName} onChange={event => set('fullName', event.target.value)} placeholder="Nombre(s) y apellidos" />
              </Field>
              <Field label="Carrera" required error={errors.career}>
                <input className="input" list="careers" value={form.career} onChange={event => set('career', event.target.value)} placeholder="Ej. Licenciatura en Administración" />
                <datalist id="careers">
                  {meta?.careers.map(career => (
                    <option key={career} value={career} />
                  ))}
                </datalist>
              </Field>
              <Field label="Área o programa de servicio" hint="Dependencia donde presta el servicio.">
                <input className="input" value={form.program} onChange={event => set('program', event.target.value)} placeholder="Ej. Biblioteca, Control escolar" />
              </Field>
            </div>
          </Step>

          <Step>
            <div className="mb-5 flex items-center gap-2 font-display text-base font-bold text-stone-900">
              <CalendarRange className="size-5 text-verde-700" />
              Servicio y horario
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Horas requeridas" required error={errors.requiredHours}>
                <input className="input" type="number" min={1} max={2000} value={form.requiredHours} onChange={event => set('requiredHours', event.target.value)} />
              </Field>
              <Field label="Fecha de inicio">
                <input className="input" type="date" value={form.startDate} onChange={event => set('startDate', event.target.value)} />
              </Field>
              <Field label="Responsable" hint={admin.role === 'responsable' ? 'Quedará asignado a ti.' : undefined}>
                <select className="input" value={form.supervisorId} disabled={admin.role !== 'superadmin'} onChange={event => set('supervisorId', event.target.value)}>
                  <option value="">Coordinación (sin responsable)</option>
                  {meta?.supervisors.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.fullName}
                      {item.area ? ` · ${item.area}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5">
              <p className="label">
                Horario asignado <span className="text-terracota-600">*</span>
              </p>
              <ScheduleEditor value={form.schedule} onChange={slots => set('schedule', slots)} error={errors.schedule} />
            </div>
          </Step>

          <Step>
            <div className="mb-5 flex items-center gap-2 font-display text-base font-bold text-stone-900">
              <KeyRound className="size-5 text-verde-700" />
              Confirma la información
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <dl className="space-y-3 text-sm">
                <Summary label="Estudiante" value={form.fullName} />
                <Summary label="Código" value={form.code} mono />
                <Summary label="Correo institucional" value={form.email} />
                <Summary label="Carrera" value={form.career} />
                <Summary label="Área o programa" value={form.program || '—'} />
                <Summary label="Responsable" value={supervisorName ?? 'Coordinación de Servicio Social'} />
                <Summary label="Horas requeridas" value={`${form.requiredHours} h${form.startDate ? ` · inicia ${formatDate(form.startDate, 'long')}` : ''}`} />
                {weeks && <Summary label="Duración estimada" value={`${weeks} semanas con este horario`} />}
              </dl>
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <ScheduleWeek schedule={form.schedule} highlightToday={false} />
              </div>
            </div>
            {!editing && (
              <p className="mt-5 flex items-start gap-2 rounded-lg border border-verde-200 bg-verde-50 px-4 py-3 text-sm text-verde-800">
                <Mail className="mt-0.5 size-4 shrink-0" />
                Al registrar, el sistema generará una contraseña segura y te mostrará un correo precargado para enviarla a {form.email || 'su correo institucional'}.
              </p>
            )}
            {submitError && (
              <div className="mt-4">
                <FormError message={submitError} />
              </div>
            )}
          </Step>
        </Stepper>
      </div>

      <CredentialsDialog
        open={created !== null}
        kind="student"
        mode="welcome"
        recipient={created ? { id: created.student.id, name: created.student.fullName, email: created.student.email, code: created.student.code } : null}
        password={created?.password ?? null}
        onClose={() => navigate(`/admin/prestadores/${created!.student.id}`)}
      />
    </>
  );
}

const Summary = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-stone-100 pb-2 last:border-0">
    <dt className="text-stone-500">{label}</dt>
    <dd className={`font-semibold break-words text-stone-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
);
