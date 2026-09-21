import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import {
  Camera,
  CircleCheck,
  Clock,
  Fingerprint,
  ImageUp,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  MapPinOff,
  RefreshCcw,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { CheckResult, GeoPoint } from '../../../../shared/contracts';
import { ApiError, errorMessage } from '../../../api/http';
import { getCurrentPosition, loadImageFile, renderEvidence } from '../../../lib/camera';
import { formatDuration, formatHours, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { FormError } from '../../../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../../../ui/Modal';
import { useToast } from '../../../ui/toast';
import { studentApi } from '../api';

interface CheckFlowProps {
  open: boolean;
  type: 'in' | 'out';
  student: { fullName: string; code: string };
  biometricDevices: number;
  onClose: () => void;
  onCompleted: (result: CheckResult) => void;
}

/** Asistente de registro: fotografía → verificación (ubicación y biometría) → confirmación */
export function CheckFlow(props: CheckFlowProps) {
  const isIn = props.type === 'in';
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      size="md"
      title={isIn ? 'Registrar entrada' : 'Registrar salida'}
      description="La hora oficial se toma del servidor al confirmar el registro."
    >
      <CheckFlowBody {...props} />
    </Modal>
  );
}

type Step = 'photo' | 'verify' | 'done';

function CheckFlowBody({ type, student, biometricDevices, onClose, onCompleted }: CheckFlowProps) {
  const isIn = type === 'in';
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ status: 'pending' | 'ok' | 'denied'; point: GeoPoint | null }>({ status: 'pending', point: null });
  const [biometric, setBiometric] = useState<{ status: 'idle' | 'working' | 'ok' | 'error'; response: Record<string, unknown> | null; message?: string }>({
    status: 'idle',
    response: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const biometricAvailable = biometricDevices > 0 && browserSupportsWebAuthn();

  useEffect(() => {
    getCurrentPosition()
      .then(point => setGeo({ status: 'ok', point }))
      .catch(() => setGeo({ status: 'denied', point: null }));
  }, []);

  const watermark = () => [
    `CUTLAQUE · SERVICIO SOCIAL · ${isIn ? 'ENTRADA' : 'SALIDA'}`,
    `${student.fullName} · ${student.code}`,
    new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'medium' }),
  ];

  const verifyBiometric = async () => {
    setBiometric({ status: 'working', response: null });
    try {
      const optionsJSON = await studentApi.authenticationOptions();
      const response = await startAuthentication({ optionsJSON });
      setBiometric({ status: 'ok', response: response as unknown as Record<string, unknown> });
    } catch (err) {
      setBiometric({
        status: 'error',
        response: null,
        message:
          err instanceof ApiError
            ? err.message
            : 'No se completó la verificación en este dispositivo. Inténtalo de nuevo o continúa solo con la fotografía.',
      });
    }
  };

  const submit = async () => {
    if (!photo) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await studentApi.check({ photo, geo: geo.point, biometric: biometric.response });
      setResult(response);
      setStep('done');
      onCompleted(response);
    } catch (err) {
      setError(errorMessage(err));
      // El desafío biométrico es de un solo uso
      setBiometric({ status: 'idle', response: null });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done' && result) {
    return <Completed result={result} onClose={onClose} />;
  }

  return (
    <>
      <ModalBody>
        <Steps current={step === 'photo' ? 0 : 1} />

        {step === 'photo' && (
          <div className="mt-5">
            <CameraCapture photo={photo} onChange={setPhoto} watermark={watermark} />
          </div>
        )}

        {step === 'verify' && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
              {photo && <img src={photo} alt="Fotografía de evidencia" className="h-16 w-20 rounded-lg object-cover" />}
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-stone-800">Fotografía capturada</p>
                <button type="button" onClick={() => setStep('photo')} className="text-xs font-medium text-verde-700 hover:underline">
                  Tomar otra
                </button>
              </div>
              <CircleCheck className="ml-auto size-5 text-verde-600" />
            </div>

            <CheckRow
              icon={geo.status === 'denied' ? MapPinOff : MapPin}
              title="Ubicación"
              tone={geo.status === 'ok' ? 'ok' : geo.status === 'pending' ? 'pending' : 'muted'}
              detail={
                geo.status === 'ok'
                  ? `Registrada con precisión de ±${geo.point!.accuracy} m`
                  : geo.status === 'pending'
                    ? 'Obteniendo ubicación…'
                    : 'No disponible: el registro se hará sin ubicación.'
              }
            />

            {biometricAvailable ? (
              <div className="rounded-xl border border-stone-200 p-3">
                <CheckRow
                  bare
                  icon={Fingerprint}
                  title="Verificación biométrica"
                  tone={biometric.status === 'ok' ? 'ok' : biometric.status === 'working' ? 'pending' : 'muted'}
                  detail={
                    biometric.status === 'ok'
                      ? 'Identidad verificada con tu dispositivo.'
                      : biometric.status === 'working'
                        ? 'Sigue las indicaciones de tu dispositivo…'
                        : 'Confirma que eres tú con tu huella o rostro.'
                  }
                />
                {biometric.status === 'error' && <p className="mt-2 text-xs text-amber-700">{biometric.message}</p>}
                {biometric.status !== 'ok' && (
                  <Button className="mt-3 w-full" icon={<Fingerprint className="size-4" />} loading={biometric.status === 'working'} onClick={verifyBiometric}>
                    Verificar con huella o rostro
                  </Button>
                )}
              </div>
            ) : (
              <CheckRow
                icon={Fingerprint}
                title="Verificación biométrica"
                tone="muted"
                detail="No has vinculado biometría. Puedes hacerlo en Mi perfil para reforzar tus registros."
              />
            )}

            <CheckRow icon={Clock} title="Hora del registro" tone="ok" detail="Se usará la hora oficial del servidor al confirmar." />
            <FormError message={error} />
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'photo' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={!photo} onClick={() => setStep('verify')}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep('photo')} disabled={submitting}>
              Atrás
            </Button>
            <Button
              variant={isIn ? 'primary' : 'accent'}
              loading={submitting}
              disabled={biometric.status === 'working'}
              icon={isIn ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
              onClick={submit}
            >
              {isIn ? 'Confirmar entrada' : 'Confirmar salida'}
            </Button>
          </>
        )}
      </ModalFooter>
    </>
  );
}

function Steps({ current }: { current: number }) {
  const labels = ['Fotografía', 'Verificación'];
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold">
      {labels.map((label, index) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full ${index <= current ? 'bg-verde-600 text-white' : 'bg-stone-200 text-stone-500'}`}
          >
            {index < current ? <CircleCheck className="size-4" /> : index + 1}
          </span>
          <span className={index <= current ? 'text-stone-800' : 'text-stone-400'}>{label}</span>
          {index < labels.length - 1 && <span className={`h-px flex-1 ${index < current ? 'bg-verde-600' : 'bg-stone-200'}`} />}
        </li>
      ))}
    </ol>
  );
}

function CheckRow({
  icon: Icon,
  title,
  detail,
  tone,
  bare = false,
}: {
  icon: typeof MapPin;
  title: string;
  detail: string;
  tone: 'ok' | 'pending' | 'muted';
  bare?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone === 'ok' ? 'bg-verde-50 text-verde-700' : tone === 'pending' ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-500'}`}
      >
        {tone === 'pending' ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-stone-800">{title}</p>
        <p className="text-xs text-stone-500">{detail}</p>
      </div>
      {tone === 'ok' && <CircleCheck className="ml-auto size-5 shrink-0 text-verde-600" />}
    </div>
  );
  return bare ? content : <div className="rounded-xl border border-stone-200 p-3">{content}</div>;
}

type CameraState = 'starting' | 'live' | 'blocked' | 'unsupported';

function CameraCapture({ photo, onChange, watermark }: { photo: string | null; onChange: (photo: string | null) => void; watermark: () => string[] }) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CameraState>('starting');

  useEffect(() => {
    if (photo) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    setState('starting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(media => {
        stream = media;
        if (cancelled) {
          media.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          void videoRef.current.play().catch(() => undefined);
        }
        setState('live');
      })
      .catch((error: DOMException) => {
        if (!cancelled) setState(error.name === 'NotAllowedError' ? 'blocked' : 'unsupported');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [photo]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    onChange(renderEvidence(video, video.videoWidth, video.videoHeight, watermark(), true));
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const image = await loadImageFile(file);
      onChange(renderEvidence(image, image.naturalWidth, image.naturalHeight, watermark(), false));
    } catch (err) {
      toast.notify((err as Error).message, 'error');
    }
  };

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-900">
        {photo ? (
          <>
            <img src={photo} alt="Fotografía de evidencia" className="size-full object-cover" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-verde-600 px-2 py-1 text-xs font-semibold text-white">
              <CircleCheck className="size-3.5" />
              Fotografía lista
            </span>
          </>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className={`size-full -scale-x-100 object-cover transition ${state === 'live' ? 'opacity-100' : 'opacity-0'}`} />
            {state === 'live' ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="aspect-[3/4] h-[74%] rounded-[50%] border-2 border-dashed border-white/70" />
                <p className="absolute bottom-3 rounded-md bg-stone-950/60 px-2.5 py-1 text-xs text-white">Centra tu rostro en la guía</p>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/85">
                {state === 'starting' ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin" />
                    Activando cámara…
                  </span>
                ) : (
                  <span>
                    <VideoOff className="mx-auto mb-3 size-7 text-white/60" />
                    {state === 'blocked'
                      ? 'El navegador bloqueó la cámara. Permite el acceso o toma la foto con la cámara del dispositivo.'
                      : 'No se pudo abrir la cámara aquí. Usa la cámara del dispositivo para tomar la fotografía.'}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {photo ? (
          <Button icon={<RefreshCcw className="size-4" />} onClick={() => onChange(null)}>
            Tomar otra
          </Button>
        ) : (
          <Button variant="primary" icon={<Camera className="size-4" />} onClick={capture} disabled={state !== 'live'}>
            Tomar fotografía
          </Button>
        )}
        <Button variant="ghost" icon={<ImageUp className="size-4" />} onClick={() => fileRef.current?.click()}>
          Usar cámara del dispositivo
        </Button>
        <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
      </div>
    </div>
  );
}

function Completed({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const isIn = result.type === 'in';
  const at = isIn ? result.record.checkIn : (result.record.checkOut ?? result.record.checkIn);
  return (
    <>
      <ModalBody className="text-center">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          className={`mx-auto grid size-20 place-items-center rounded-full ring-8 ${isIn ? 'bg-verde-600 text-white ring-verde-100' : 'bg-terracota-500 text-white ring-terracota-100'}`}
        >
          {isIn ? <LogIn className="size-9" /> : <LogOut className="size-9" />}
        </motion.span>
        <p className={`eyebrow mt-5 ${isIn ? 'text-verde-700' : 'text-terracota-600'}`}>{isIn ? 'Entrada registrada' : 'Salida registrada'}</p>
        <p className="mt-1 font-display text-4xl font-extrabold text-stone-900">{formatTime(at)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 font-medium text-stone-700">
            <Camera className="size-3.5" /> Fotografía guardada
          </span>
          {result.biometricVerified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-verde-50 px-2 py-1 font-medium text-verde-700">
              <ShieldCheck className="size-3.5" /> Biometría verificada
            </span>
          )}
          {result.record.lateMinutes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-800">
              <Clock className="size-3.5" /> Retardo de {result.record.lateMinutes} min
            </span>
          )}
        </div>
        <p className="mt-5 text-sm text-stone-600">
          {isIn
            ? 'Recuerda registrar tu salida al terminar tu jornada.'
            : `Jornada de ${formatDuration(result.record.minutes)}. Llevas ${formatHours(result.validMinutes)} de ${result.requiredHours} h.`}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose} className="w-full sm:w-auto">
          Listo
        </Button>
      </ModalFooter>
    </>
  );
}
