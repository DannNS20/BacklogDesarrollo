import { Fingerprint, LogIn, PenLine, TriangleAlert } from 'lucide-react';
import type { AccessRecord } from '../../shared/contracts';
import { INCIDENT_LABELS } from '../../shared/rules';
import { Badge, PulseDot } from '../ui/Display';

export function RecordBadges({ record }: { record: AccessRecord }) {
  const inside = !record.checkOut && !record.incident;
  return (
    <>
      {inside && (
        <Badge tone="verde">
          <PulseDot />
          Dentro del campus
        </Badge>
      )}
      {record.incident && (
        <Badge tone="amber" icon={TriangleAlert}>
          {INCIDENT_LABELS[record.incident]}
        </Badge>
      )}
      {record.biometric && (
        <Badge tone="verde" icon={Fingerprint}>
          Biometría
        </Badge>
      )}
      {record.source === 'manual' && <Badge icon={PenLine}>Registro en caseta</Badge>}
      {!record.checkIn && record.checkOut && (
        <Badge tone="neutral" icon={LogIn}>
          Sin entrada
        </Badge>
      )}
    </>
  );
}
