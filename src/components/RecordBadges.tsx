import { Ban, Clock, Fingerprint, PenLine, TriangleAlert } from 'lucide-react';
import type { AttendanceRecord } from '../../shared/contracts';
import { dateKey } from '../lib/format';
import { Badge, PulseDot } from '../ui/Display';

export function RecordBadges({ record }: { record: AttendanceRecord }) {
  const isToday = dateKey(new Date(record.checkIn)) === dateKey(new Date());
  return (
    <>
      {record.status === 'rejected' && (
        <Badge tone="red" icon={Ban}>
          Invalidado
        </Badge>
      )}
      {!record.checkOut &&
        (isToday ? (
          <Badge tone="verde">
            <PulseDot />
            En curso
          </Badge>
        ) : (
          <Badge tone="amber" icon={TriangleAlert}>
            Sin salida
          </Badge>
        ))}
      {record.lateMinutes > 0 && (
        <Badge tone="amber" icon={Clock}>
          Retardo {record.lateMinutes} min
        </Badge>
      )}
      {(record.checkInEvidence.biometric || record.checkOutEvidence?.biometric) && (
        <Badge tone="verde" icon={Fingerprint}>
          Biometría
        </Badge>
      )}
      {record.source === 'manual' && <Badge icon={PenLine}>Captura manual</Badge>}
    </>
  );
}
