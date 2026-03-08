import { ComputedCandle } from '@candle/engine';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface CandleTableProps {
  rows: ComputedCandle[];
  onRowClick: (index: number) => void;
}

function formatCellValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '\u2014';
  }
  if (typeof value === 'string') {
    return value;
  }
  return Number(value).toFixed(4);
}

export function CandleTable({ rows, onRowClick }: CandleTableProps) {
  const variableColumns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.variables ?? {}))),
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Candle Table</CardTitle>
      </CardHeader>
      <CardContent className="h-[76vh] overflow-auto p-0 xl:h-[80vh]">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left">time</th>
              <th className="border-b border-border px-3 py-2 text-right">open</th>
              <th className="border-b border-border px-3 py-2 text-right">high</th>
              <th className="border-b border-border px-3 py-2 text-right">low</th>
              <th className="border-b border-border px-3 py-2 text-right">close</th>
              {variableColumns.map((column) => (
                <th key={column} className="border-b border-border px-3 py-2 text-right">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.time}-${index}`}
                className="cursor-pointer hover:bg-[#f2f7f1]"
                onClick={() => onRowClick(index)}
              >
                <td className="border-b border-border px-3 py-2">{row.time}</td>
                <td className="border-b border-border px-3 py-2 text-right">{formatCellValue(row.open)}</td>
                <td className="border-b border-border px-3 py-2 text-right">{formatCellValue(row.high)}</td>
                <td className="border-b border-border px-3 py-2 text-right">{formatCellValue(row.low)}</td>
                <td className="border-b border-border px-3 py-2 text-right">{formatCellValue(row.close)}</td>
                {variableColumns.map((column) => (
                  <td key={column} className="border-b border-border px-3 py-2 text-right">
                    {formatCellValue(row.variables[column] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
