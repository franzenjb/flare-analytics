'use client';

import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { exportToCsv, copyToClipboard, type ExportColumn } from '@/lib/export';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
}

export default function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(data, columns);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => exportToCsv(data, columns, filename)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-arc-gray-500 hover:text-arc-black hover:bg-arc-gray-100 rounded transition-colors"
        title="Download CSV"
      >
        <Download size={12} />
        <span className="hidden sm:inline">CSV</span>
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 text-xs text-arc-gray-500 hover:text-arc-black hover:bg-arc-gray-100 rounded transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check size={12} className="text-arc-success" /> : <Copy size={12} />}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
