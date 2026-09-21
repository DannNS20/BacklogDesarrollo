type Cell = string | number | null | undefined;

const escape = (value: Cell) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Descarga un CSV compatible con Excel (BOM UTF-8 para acentos) */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const csv = '﻿' + rows.map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
