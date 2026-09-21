import { Download, History as HistoryIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AccessRecord } from '../../../../shared/contracts';
import { RecordBadges } from '../../../components/RecordBadges';
import { useAsync } from '../../../hooks/useAsync';
import { downloadCsv } from '../../../lib/csv';
import { capitalize, dateKey, formatDate, formatDuration, formatTime } from '../../../lib/format';
import { Button } from '../../../ui/Button';
import { EmptyState, ErrorState, PageHeader, PageLoader, SectionCard } from '../../../ui/Display';
import { Segmented } from '../../../ui/Segmented';
import { personApi } from '../api';

type Filter = 'all' | 'inside' | 'incident';

const matches = (record: AccessRecord, filter: Filter) =>
  filter === 'all' || (filter === 'inside' && !record.checkOut && !record.incident) || (filter === 'incident' && !!record.incident);

export default function PersonHistory() {
  const { data, loading, error, reload } = useAsync(() => personApi.records(), []);
  const [filter, setFilter] = useState<Filter>('all');

  const groups = useMemo(() => {
    const map = new Map<string, AccessRecord[]>();
    for (const record of (data ?? []).filter(r => matches(r, filter))) {
      const reference = record.checkIn ?? record.checkOut!;
      const label = capitalize(new Date(reference).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
      map.set(label, [...(map.get(label) ?? []), record]);
    }
    return [...map];
  }, [data, filter]);

  if (!data) return loading ? <PageLoader /> : <ErrorState message={error ?? ''} onRetry={reload} />;

  const exportCsv = () =>
    downloadCsv(`mis-accesos-${dateKey(new Date())}.csv`, [
      ['Fecha', 'Acceso', 'Entrada', 'Salida', 'Minutos dentro', 'Estado', 'Biometría', 'Origen'],
      ...data.map(record => [
        dateKey(new Date(record.checkIn ?? record.checkOut!)),
        record.accessPointName,
        record.checkIn ? formatTime(record.checkIn) : 'Sin entrada',
        record.checkOut ? formatTime(record.checkOut) : 'Sin salida',
        record.minutes,
        record.incident ? 'Incidencia' : 'Correcto',
        record.biometric ? 'Sí' : 'No',
        record.source === 'app' ? 'Celular' : 'Caseta',
      ]),
    ]);

  return (
    <>
      <PageHeader
        eyebrow="Mis registros"
        title="Historial de accesos"
        description="Todas tus entradas y salidas del campus."
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportCsv} disabled={!data.length}>
            Descargar CSV
          </Button>
        }
      />

      <div className="mb-4">
        <Segmented
          id="person-history"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: data.length },
            { value: 'inside', label: 'Sin salida', count: data.filter(r => matches(r, 'inside')).length },
            { value: 'incident', label: 'Incidencias', count: data.filter(r => matches(r, 'incident')).length },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <EmptyState icon={HistoryIcon} title="Sin registros" description="No hay accesos que coincidan con este filtro." />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([month, records]) => (
            <SectionCard key={month} title={month} description={`${records.length} registros`}>
              <ul className="divide-y divide-stone-100">
                {records.map(record => (
                  <li key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-semibold text-stone-800">{capitalize(formatDate(record.checkIn ?? record.checkOut!, 'weekday'))}</p>
                      <p className="font-mono text-xs text-stone-500">
                        {record.checkIn ? formatTime(record.checkIn) : '—'} → {record.checkOut ? formatTime(record.checkOut) : '…'}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-stone-600">{record.accessPointName}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <RecordBadges record={record} />
                      </div>
                    </div>
                    <p className="w-20 text-right text-sm font-bold text-stone-800">{record.checkOut ? formatDuration(record.minutes) : '—'}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      )}
    </>
  );
}
