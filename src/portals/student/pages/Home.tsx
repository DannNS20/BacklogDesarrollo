import {
  Award,
  CalendarCheck,
  CalendarDays,
  Camera,
  ChevronRight,
  Fingerprint,
  History,
  LogIn,
  LogOut,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StudentOverview } from '../../../../shared/contracts';
import { slotMinutes, toMinutes } from '../../../../shared/rules';
import { RecordBadges } from '../../../components/RecordBadges';
import BlurText from '../../../components/reactbits/BlurText/BlurText';
import ClickSpark from '../../../components/reactbits/ClickSpark/ClickSpark';
import Counter from '../../../components/reactbits/Counter/Counter';
import CountUp from '../../../components/reactbits/CountUp/CountUp';
import { ScheduleWeek } from '../../../components/ScheduleWeek';
import { useAsync } from '../../../hooks/useAsync';
import { useNow } from '../../../hooks/useNow';
import { capitalize, formatDate, formatDuration, formatHours, formatTime, toHours } from '../../../lib/format';
import { firstName } from '../../../lib/text';
import { Button } from '../../../ui/Button';
import { Badge, ErrorState, PageLoader, ProgressRing, PulseDot, SectionCard } from '../../../ui/Display';
import { useToast } from '../../../ui/toast';
import { studentApi } from '../api';
import { CheckFlow } from '../components/CheckFlow';

export default function StudentHome() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => studentApi.overview(), [], { pollMs: 60_000 });
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowType, setFlowType] = useState<'in' | 'out'>('in');

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;

  const { profile } = data;
  const startFlow = () => {
    setFlowType(data.openRecord ? 'out' : 'in');
    setFlowOpen(true);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-terracota-600">{capitalize(formatDate(new Date(), 'long'))}</p>
          <BlurText
            text={`Hola, ${firstName(profile.fullName)}`}
            delay={60}
            animationFrom={{ filter: 'blur(6px)', opacity: 0, y: -8 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900"
          />
          <p className="mt-0.5 text-sm text-stone-500">
            {profile.career}
            {profile.program && ` · ${profile.program}`}
          </p>
        </div>
        {data.completedAt ? (
          <Badge tone="verde" icon={Award}>
            Servicio completado
          </Badge>
        ) : data.openRecord ? (
          <Badge tone="verde">
            <PulseDot />
            En servicio
          </Badge>
        ) : (
          <Badge>Fuera de servicio</Badge>
        )}
      </div>

      {data.completedAt && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-oliva-300 bg-lime-50 px-5 py-4 text-sm text-oliva-700">
          <Award className="mt-0.5 size-5 shrink-0" />
          <p>
            <b>¡Felicidades! Completaste tus {profile.requiredHours} horas de servicio social.</b> Acude a la Coordinación para continuar con tu
            trámite de liberación.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CheckCard overview={data} onCheck={startFlow} />
        </div>
        <ProgressCard overview={data} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <SectionCard className="lg:col-span-2" title="Mi horario" description="Asignado por la Coordinación" icon={CalendarDays}>
          <ScheduleWeek schedule={data.schedule} />
        </SectionCard>

        <SectionCard
          className="lg:col-span-3"
          title="Actividad reciente"
          icon={History}
          action={
            <Link to="/estudiante/historial" className="inline-flex items-center text-xs font-semibold text-verde-700 hover:underline">
              Ver historial <ChevronRight className="size-3.5" />
            </Link>
          }
        >
          {data.recent.length ? (
            <ul className="divide-y divide-stone-100">
              {data.recent.map(record => (
                <li key={record.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-11 shrink-0 text-center">
                    <p className="font-display text-xl leading-none font-extrabold text-stone-900">{new Date(record.checkIn).getDate()}</p>
                    <p className="text-[10px] font-semibold text-stone-500 uppercase">
                      {new Date(record.checkIn).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-800">
                      {formatTime(record.checkIn)} – {record.checkOut ? formatTime(record.checkOut) : '…'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <RecordBadges record={record} />
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${record.status === 'rejected' ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                    {record.checkOut ? formatDuration(record.minutes) : '—'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-stone-500">Aún no tienes registros. Tu primera entrada aparecerá aquí.</p>
          )}
        </SectionCard>
      </div>

      <CheckFlow
        open={flowOpen}
        type={flowType}
        student={{ fullName: profile.fullName, code: profile.code }}
        biometricDevices={data.biometricDevices}
        onClose={() => setFlowOpen(false)}
        onCompleted={result => {
          toast.notify(result.type === 'in' ? 'Entrada registrada correctamente.' : 'Salida registrada. ¡Buen trabajo!', 'success');
          void reload();
        }}
      />
    </>
  );
}

function CheckCard({ overview, onCheck }: { overview: StudentOverview; onCheck: () => void }) {
  const now = useNow(1000);
  const { openRecord, todaySlot, lateToleranceMinutes, biometricDevices, todayMinutes } = overview;

  if (openRecord) {
    const elapsed = Math.max(0, Math.floor((now.getTime() - Date.parse(openRecord.checkIn)) / 1000));
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const planned = todaySlot ? slotMinutes(todaySlot) : null;
    const sessionRatio = planned ? Math.min(1, elapsed / 60 / planned) : 0;
    const digit = { fontSize: 48, textColor: '#ffffff', fontWeight: 800, gap: 0, horizontalPadding: 0, gradientHeight: 0, places: [10, 1] as number[] };

    return (
      <ClickSpark sparkColor="#ffffff" sparkRadius={24} sparkCount={10}>
        <section className="brand-hero relative h-full overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-verde-900/20 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow flex items-center gap-2 text-white/90">
              <PulseDot className="bg-oliva-300" />
              En servicio
            </p>
            {openRecord.lateMinutes > 0 && (
              <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-200/40">
                Retardo {openRecord.lateMinutes} min
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/80">
            Entrada registrada a las <b className="text-white">{formatTime(openRecord.checkIn)}</b>
          </p>

          <div className="mt-5 flex items-center font-display" aria-label={`Tiempo transcurrido ${hours} horas ${minutes} minutos`}>
            <Counter value={hours} {...digit} />
            <span className="px-1 text-4xl font-extrabold text-white/60">:</span>
            <Counter value={minutes} {...digit} />
            <span className="px-1 text-4xl font-extrabold text-white/60">:</span>
            <Counter value={seconds} {...digit} fontSize={30} />
          </div>
          <p className="text-xs text-white/70">Tiempo transcurrido en esta jornada</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroTile label="Salida programada" value={todaySlot ? todaySlot.end : 'Sin horario hoy'} />
            <HeroTile label="Jornada de hoy" value={planned ? formatDuration(planned) : '—'} />
          </div>
          {planned && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-oliva-300 transition-[width] duration-1000" style={{ width: `${sessionRatio * 100}%` }} />
            </div>
          )}

          <Button variant="accent" size="lg" className="mt-6 w-full sm:w-auto" icon={<LogOut className="size-5" />} onClick={onCheck}>
            Marcar salida
          </Button>
        </section>
      </ClickSpark>
    );
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const delay = todaySlot ? minutesNow - toMinutes(todaySlot.start) : 0;
  const ended = todaySlot ? minutesNow >= toMinutes(todaySlot.end) : false;

  let message: string;
  let warning = false;
  if (!todaySlot) message = 'Hoy no tienes horario asignado. Si tu responsable te citó, puedes registrar tu entrada.';
  else if (todayMinutes > 0) message = `Ya registraste ${formatDuration(todayMinutes)} hoy. Puedes registrar otra jornada si es necesario.`;
  else if (ended) message = `Tu horario de hoy (${todaySlot.start} – ${todaySlot.end}) ya terminó.`;
  else if (delay < 0) message = `Tu entrada es a las ${todaySlot.start}. Faltan ${formatDuration(-delay)}.`;
  else if (delay <= lateToleranceMinutes) message = `Tu horario inició a las ${todaySlot.start}. Aún estás dentro de la tolerancia de ${lateToleranceMinutes} min.`;
  else {
    message = `Tu horario inició a las ${todaySlot.start}. Se registrará un retardo de ${delay} min.`;
    warning = true;
  }

  return (
    <ClickSpark sparkColor="#1e6b3a" sparkRadius={24} sparkCount={10}>
      <section className="card relative h-full overflow-hidden p-6 sm:p-7">
        <span className="absolute inset-y-0 left-0 w-1.5 bg-verde-600" />
        <p className="eyebrow text-verde-700">Registro de asistencia</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-stone-900">Marca tu entrada</h2>
        <p className={`mt-2 flex items-start gap-2 text-sm ${warning ? 'text-amber-700' : 'text-stone-600'}`}>
          {warning && <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          {message}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Horario de hoy" value={todaySlot ? `${todaySlot.start} – ${todaySlot.end}` : 'Sin horario'} />
          <Tile label="Salida prevista" value={todaySlot ? todaySlot.end : '—'} />
          <Tile label="Hora actual" value={now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })} mono />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button variant="primary" size="lg" icon={<LogIn className="size-5" />} onClick={onCheck}>
            Marcar entrada
          </Button>
          <span className="flex items-center gap-1.5 text-xs text-stone-500">
            <Camera className="size-3.5" />
            Se pedirá fotografía
            {biometricDevices > 0 && (
              <>
                {' '}
                y <Fingerprint className="size-3.5" /> biometría
              </>
            )}
          </span>
        </div>
      </section>
    </ClickSpark>
  );
}

function ProgressCard({ overview }: { overview: StudentOverview }) {
  const required = overview.profile.requiredHours * 60;
  const ratio = overview.validMinutes / required;
  const remaining = Math.max(0, required - overview.validMinutes);

  return (
    <SectionCard className="lg:col-span-2" title="Avance del servicio" icon={Target} bodyClassName="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center gap-5 p-5 sm:flex-row lg:flex-col xl:flex-row">
        <ProgressRing value={ratio} size={172}>
          <div>
            <p className="font-display text-4xl leading-none font-extrabold text-stone-900">
              <CountUp to={toHours(overview.validMinutes)} duration={1.4} />
            </p>
            <p className="mt-1 text-xs text-stone-500">de {overview.profile.requiredHours} horas</p>
            <p className="mt-1.5 text-sm font-bold text-verde-700">{Math.min(100, Math.round(ratio * 100))}%</p>
          </div>
        </ProgressRing>
        <dl className="grid w-full grid-cols-2 gap-2.5">
          <Metric label="Cumplidas" value={formatHours(overview.validMinutes)} />
          <Metric label="Restantes" value={formatHours(remaining)} highlight />
          <Metric label="Jornadas" value={String(overview.sessions)} />
          <Metric label="Retardos" value={String(overview.lateCount)} />
        </dl>
      </div>
      <p className="flex items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-3 text-xs text-stone-600">
        <CalendarCheck className="size-4 shrink-0 text-verde-700" />
        {overview.completedAt
          ? 'Completaste tus horas requeridas.'
          : overview.estimatedCompletionDate
            ? `Término estimado: ${formatDate(overview.estimatedCompletionDate, 'long')}, si mantienes tu horario.`
            : 'Sin horario asignado para estimar la fecha de término.'}
      </p>
    </SectionCard>
  );
}

const Tile = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="rounded-lg border border-stone-200 bg-stone-50/60 px-3 py-2.5">
    <p className="text-[11px] font-medium text-stone-500">{label}</p>
    <p className={`mt-0.5 text-sm font-bold text-stone-900 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</p>
  </div>
);

const HeroTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-white/12 px-3 py-2.5 ring-1 ring-white/20 backdrop-blur">
    <p className="text-[11px] font-medium text-white/70">{label}</p>
    <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
  </div>
);

const Metric = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-lg px-3 py-2.5 ${highlight ? 'bg-terracota-50 ring-1 ring-terracota-100' : 'bg-stone-50 ring-1 ring-stone-100'}`}>
    <dt className="text-[11px] font-medium text-stone-500">{label}</dt>
    <dd className={`font-display text-lg font-extrabold ${highlight ? 'text-terracota-700' : 'text-stone-900'}`}>{value}</dd>
  </div>
);
