'use client';

import { useCallback } from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape fields containing commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  // Collect all unique keys across all rows
  const headers = Array.from(
    data.reduce<Set<string>>((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  );

  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Handle arrays by joining with semicolons
        if (Array.isArray(value)) {
          return escapeCSVField(value.join('; '));
        }
        return escapeCSVField(value);
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

export default function ExportButton({
  data,
  filename = 'export.csv',
  label = 'Export CSV',
  className,
  disabled = false,
}: ExportButtonProps) {
  const handleExport = useCallback(() => {
    if (data.length === 0) return;

    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    URL.revokeObjectURL(url);
  }, [data, filename]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className={
        className ||
        'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-ep-text bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue/30 disabled:opacity-50 disabled:cursor-not-allowed'
      }
      title={data.length === 0 ? 'No data to export' : `Export ${data.length} rows as CSV`}
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
