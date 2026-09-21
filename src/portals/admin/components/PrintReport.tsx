import type { AttendanceRow, StudentDetail } from '../../../../shared/contracts';
import { WEEKDAY_ORDER, WEEKDAYS } from '../../../../shared/rules';
import { formatDate, formatTime, toHours } from '../../../lib/format';

const cell = 'border border-stone-400 px-2 py-1';

/**
 * Reporte formal para el expediente: se oculta en pantalla y aparece al imprimir.
 * Sustituye las hojas diarias por un único documento con firmas.
 */
export function PrintReport({ student, records, adminName }: { student: StudentDetail; records: AttendanceRow[]; adminName: string }) {
  const rows = [...records].sort((a, b) => Date.parse(a.checkIn) - Date.parse(b.checkIn));
  const validMinutes = rows.filter(r => r.status === 'valid').reduce((total, r) => total + r.minutes, 0);
  const schedule = new Map(student.schedule.map(slot => [slot.weekday, slot]));

  return (
    <div className="hidden text-[11px] text-black print:block">
      <div className="flex items-end justify-between border-b-2 border-[#1e6b3a] pb-3">
        <div>
          <p className="font-display text-2xl font-black tracking-tight">
            <span className="text-[#5a8526]">CU</span>
            <span className="text-[#c9692f]">TLAQUE</span>
          </p>
          <p className="text-[9px] font-semibold tracking-[0.2em] uppercase">Centro Universitario de Tlaquepaque · Universidad de Guadalajara</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase">Reporte de horas de servicio social</p>
          <p>Emitido el {formatDate(new Date(), 'long')}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${cell} w-1/6 font-semibold`}>Prestador</td>
            <td className={cell}>{student.fullName}</td>
            <td className={`${cell} w-1/6 font-semibold`}>Código</td>
            <td className={cell}>{student.code}</td>
          </tr>
          <tr>
            <td className={`${cell} font-semibold`}>Carrera</td>
            <td className={cell}>{student.career}</td>
            <td className={`${cell} font-semibold`}>Correo</td>
            <td className={cell}>{student.email}</td>
          </tr>
          <tr>
            <td className={`${cell} font-semibold`}>Área / programa</td>
            <td className={cell}>{student.program || '—'}</td>
            <td className={`${cell} font-semibold`}>Responsable</td>
            <td className={cell}>{student.supervisorName ?? 'Coordinación de Servicio Social'}</td>
          </tr>
          <tr>
            <td className={`${cell} font-semibold`}>Horas válidas</td>
            <td className={cell}>
              {toHours(validMinutes)} de {student.requiredHours} h
            </td>
            <td className={`${cell} font-semibold`}>Horario</td>
            <td className={cell}>
              {WEEKDAY_ORDER.filter(day => schedule.has(day))
                .map(day => `${WEEKDAYS[day].slice(0, 3)} ${schedule.get(day)!.start}–${schedule.get(day)!.end}`)
                .join(' · ') || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-stone-100">
            {['#', 'Fecha', 'Entrada', 'Salida', 'Horas', 'Evidencia', 'Estado'].map(header => (
              <th key={header} className={`${cell} text-left`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className={cell}>{index + 1}</td>
              <td className={cell}>{formatDate(row.checkIn)}</td>
              <td className={cell}>{formatTime(row.checkIn)}</td>
              <td className={cell}>{row.checkOut ? formatTime(row.checkOut) : 'Sin salida'}</td>
              <td className={cell}>{toHours(row.minutes)}</td>
              <td className={cell}>
                {row.source === 'manual' ? 'Captura manual' : `Foto${row.checkInEvidence.biometric ? ' + biometría' : ''}${row.checkInEvidence.geo ? ' + ubicación' : ''}`}
              </td>
              <td className={cell}>{row.status === 'valid' ? (row.lateMinutes ? `Válido (retardo ${row.lateMinutes} min)` : 'Válido') : 'Invalidado'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className={`${cell} text-right font-semibold`}>
              Total de horas válidas
            </td>
            <td className={`${cell} font-bold`}>{toHours(validMinutes)}</td>
            <td colSpan={2} className={cell} />
          </tr>
        </tfoot>
      </table>

      <div className="mt-20 grid grid-cols-3 gap-10 text-center">
        <div className="border-t border-black pt-2">
          {student.fullName}
          <br />
          Prestador de servicio social
        </div>
        <div className="border-t border-black pt-2">
          {student.supervisorName ?? 'Responsable del área'}
          <br />
          Responsable del programa
        </div>
        <div className="border-t border-black pt-2">
          {adminName}
          <br />
          Coordinación de Servicio Social
        </div>
      </div>
    </div>
  );
}
