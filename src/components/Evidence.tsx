import { Fingerprint, ImageOff, MapPin, MapPinOff, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { EvidenceInfo } from '../../shared/contracts';
import { formatDateTime } from '../lib/format';
import { Badge } from '../ui/Display';

export function EvidenceThumb({ src, label, onClick }: { src: string; label: string; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="group relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200 transition hover:ring-verde-600"
    >
      {failed ? (
        <ImageOff className="size-4 text-stone-400" />
      ) : (
        <img src={src} alt={label} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover transition group-hover:scale-105" />
      )}
    </button>
  );
}

interface EvidencePanelProps {
  title: string;
  at: string | null;
  src: string | null;
  evidence: EvidenceInfo | null;
}

/** Fotografía + metadatos de un registro de entrada o salida */
export function EvidencePanel({ title, at, src, evidence }: EvidencePanelProps) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="relative aspect-[4/3] bg-stone-100">
        {src && evidence?.photo && !failed ? (
          <img src={src} alt={`Evidencia de ${title.toLowerCase()}`} onError={() => setFailed(true)} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-center text-sm text-stone-400">
            <span>
              <ShieldAlert className="mx-auto mb-2 size-6" />
              {at ? 'Sin fotografía (captura manual)' : 'Aún no registrada'}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-md bg-stone-950/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur">{title}</span>
      </div>
      <figcaption className="space-y-2 px-4 py-3 text-sm">
        <p className="font-medium text-stone-800">{at ? formatDateTime(at) : '—'}</p>
        {evidence && (
          <div className="flex flex-wrap gap-1.5">
            {evidence.biometric ? (
              <Badge tone="verde" icon={Fingerprint}>
                Biometría verificada
              </Badge>
            ) : (
              <Badge icon={Fingerprint}>Sin biometría</Badge>
            )}
            {evidence.geo ? (
              <a
                href={`https://www.google.com/maps?q=${evidence.geo.lat},${evidence.geo.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
                title="Ver ubicación en el mapa"
              >
                <Badge tone="blue" icon={MapPin}>
                  Ubicación ±{evidence.geo.accuracy} m
                </Badge>
              </a>
            ) : (
              <Badge icon={MapPinOff}>Sin ubicación</Badge>
            )}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
