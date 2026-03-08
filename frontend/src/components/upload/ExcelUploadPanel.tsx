import { ChangeEvent, useState } from 'react';
import { VariableConfig } from '@candle/engine';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ExcelUploadPanelProps {
  variables: VariableConfig[];
  onRowsProcessed: (rows: unknown[]) => void;
}

export function ExcelUploadPanel({ variables, onRowsProcessed }: ExcelUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('No file uploaded');

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const upload = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('variables', JSON.stringify(variables));

    const response = await api.post('/uploads/excel-candles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const resultRows = response.data?.result?.rows ?? [];
    onRowsProcessed(resultRows);

    setSummary(
      `${response.data.fileSummary.name}: ${response.data.fileSummary.normalizedRows} normalized rows`,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="w-full text-xs" />
        <Button size="sm" onClick={upload} disabled={!file}>
          Upload & Compute
        </Button>
        <div className="rounded-md border border-border bg-[#f4f8f3] px-3 py-2 text-xs text-muted">
          {summary}
        </div>
      </CardContent>
    </Card>
  );
}
