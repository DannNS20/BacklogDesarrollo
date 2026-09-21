import { Eye, Fingerprint, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AttendanceRow } from '../../../../shared/contracts';
import { EvidenceThumb } from '../../../components/Evidence';
import { RecordBadges } from '../../../components/RecordBadges';
import { capitalize, formatDate, formatDuration, formatTime } from '../../../lib/format';
import { Badge } from '../../../ui/Display';
import { adminApi } from '../api';

interface AttendanceTableProps {
  rows: AttendanceRow[];
  showStudent?: boolean;
  canDelete?: boolean;
  emptyMessage?: string;
  onReview: (row: AttendanceRow) => void;
  onEdit: (row: AttendanceRow) => void;
  onDelete?: (row: AttendanceRow) => void;
}

export function AttendanceTable({ rows, showStudent = true, canDelete = false, emptyMessage = 'No hay registros.', onReview, onEdit, onDelete }: AttendanceTableProps) {
  if (!rows.length) return <p className="px-6 py-14 text-center text-sm text-stone-500">{emptyMessage}</p>;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
            <th className="px-5 py-2.5">Fecha</th>
            {showStudent && <th className="px-5 py-2.5">Prestador</th>}
            <th className="px-5 py-2.5">Entrada</th>
            <th className="px-5 py-2.5">Salida</th>
            <th className="px-5 py-2.5">Duración</th>
            <th className="px-5 py-2.5">Evidencia</th>
            <th className="px-5 py-2.5">Estado</th>
            <th className="px-5 py-2.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map(row => {
            const biometric = row.checkInEvidence.biometric || row.checkOutEvidence?.biometric;
            const geo = row.checkInEvidence.geo || row.checkOutEvidence?.geo;
            const clean = row.status === 'valid' && row.checkOut && !row.lateMinutes && row.source === 'portal' && !biometric;
            return (
              <tr key={row.id} className={`transition hover:bg-stone-50/80 ${row.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                <td className="px-5 py-3 whitespace-nowrap text-stone-700">{capitalize(formatDate(row.checkIn, 'weekday'))}</td>
                {showStudent && (
                  <td className="px-5 py-3">
                    <Link to={`/admin/prestadores/${row.studentId}`} className="group block">
                      <span className="block font-semibold text-stone-800 group-hover:text-verde-700">{row.studentName}</span>
                      <span className="font-mono text-xs text-stone-500">{row.studentCode}</span>
                    </Link>
                  </td>
                )}
                <td className="px-5 py-3 font-mono text-stone-800">{formatTime(row.checkIn)}</td>
                <td className="px-5 py-3 font-mono text-stone-800">{row.checkOut ? formatTime(row.checkOut) : '—'}</td>
                <td className={`px-5 py-3 whitespace-nowrap font-medium ${row.status === 'rejected' ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                  {row.checkOut ? formatDuration(row.minutes) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {row.checkInEvidence.photo && <EvidenceThumb src={adminApi.evidenceUrl(row.id, 'in')} label="Evidencia de entrada" onClick={() => onReview(row)} />}
                    {row.checkOutEvidence?.photo && <EvidenceThumb src={adminApi.evidenceUrl(row.id, 'out')} label="Evidencia de salida" onClick={() => onReview(row)} />}
                    {!row.checkInEvidence.photo && !row.checkOutEvidence?.photo && <span className="text-xs text-stone-400">Sin foto</span>}
                    <span className="ml-1 flex gap-1">
                      <Fingerprint className={`size-4 ${biometric ? 'text-verde-600' : 'text-stone-300'}`} aria-label={biometric ? 'Con biometría' : 'Sin biometría'} />
                      <MapPin className={`size-4 ${geo ? 'text-sky-600' : 'text-stone-300'}`} aria-label={geo ? 'Con ubicación' : 'Sin ubicación'} />
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex max-w-60 flex-wrap gap-1">
                    <RecordBadges record={row} />
                    {clean && <Badge tone="verde">Válido</Badge>}
                  </div>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <IconAction label="Revisar evidencia" onClick={() => onReview(row)}>
                    <Eye className="size-4" />
                  </IconAction>
                  <IconAction label="Corregir registro" onClick={() => onEdit(row)}>
                    <Pencil className="size-4" />
                  </IconAction>
                  {canDelete && onDelete && (
                    <IconAction label="Eliminar registro" danger onClick={() => onDelete(row)}>
                      <Trash2 className="size-4" />
                    </IconAction>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IconAction({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-md p-2 text-stone-400 transition ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-stone-100 hover:text-stone-800'}`}
    >
      {children}
    </button>
  );
}
