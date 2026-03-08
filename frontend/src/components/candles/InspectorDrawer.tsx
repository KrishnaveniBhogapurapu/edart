import { ComputedCandle } from '@candle/engine';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface InspectorDrawerProps {
  row: ComputedCandle | null;
}

export function InspectorDrawer({ row }: InspectorDrawerProps) {
  if (!row) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inspector</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted">Select a row to inspect calculations.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspector: {row.time}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {Object.entries(row.trace ?? {}).map(([name, trace]) => (
          <div key={name} className="rounded-md border border-border bg-[#f8faf7] p-2">
            <div className="font-semibold text-foreground">{name}</div>
            <pre className="mt-1 whitespace-pre-wrap text-[11px] text-muted">
              {JSON.stringify(trace, null, 2)}
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
