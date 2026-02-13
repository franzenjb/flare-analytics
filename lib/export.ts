// CSV export + clipboard utilities for FLARE Analytics v2

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

/** Export data as CSV download */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      if (val == null) return '';
      const formatted = col.format ? col.format(val) : String(val);
      // Escape quotes in CSV
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy data to clipboard as tab-separated table */
export async function copyToClipboard<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[]
): Promise<boolean> {
  try {
    const header = columns.map(c => c.label).join('\t');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col.key];
        if (val == null) return '';
        return col.format ? col.format(val) : String(val);
      }).join('\t')
    );

    const text = [header, ...rows].join('\n');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
