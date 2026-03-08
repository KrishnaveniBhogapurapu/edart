import { AppWorkspaceConfig } from '@candle/engine';
import { useEffect, useState } from 'react';
import { MODES, INTERVALS } from '../../lib/constants';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

interface SessionConfigPanelProps {
  config: AppWorkspaceConfig;
  onSave: (next: Partial<AppWorkspaceConfig>) => void;
}

function toLocalDateTimeInput(isoOrLocal?: string | null): string {
  if (!isoOrLocal) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoOrLocal)) {
    return isoOrLocal;
  }

  const date = new Date(isoOrLocal);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function SessionConfigPanel({ config, onSave }: SessionConfigPanelProps) {
  const [anchorLocal, setAnchorLocal] = useState<string>(
    toLocalDateTimeInput(config.session.anchorRealTime ?? null),
  );

  useEffect(() => {
    setAnchorLocal(toLocalDateTimeInput(config.session.anchorRealTime ?? null));
  }, [config.session.anchorRealTime]);

  const saveAnchor = () => {
    onSave({
      session: {
        ...config.session,
        anchorRealTime: anchorLocal ? new Date(anchorLocal).toISOString() : undefined,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session & Source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Mode</label>
          <Select
            value={config.mode}
            onChange={(event) =>
              onSave({ mode: event.target.value as AppWorkspaceConfig['mode'] })
            }
          >
            {MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Interval</label>
          <Select
            value={config.interval}
            onChange={(event) =>
              onSave({ interval: event.target.value as AppWorkspaceConfig['interval'] })
            }
          >
            {INTERVALS.map((interval) => (
              <option key={interval} value={interval}>
                {interval}
              </option>
            ))}
          </Select>
        </div>

        {config.mode === 'MOCK' ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                Treat this real time as 09:15
              </label>
              <Input type="datetime-local" value={anchorLocal} onChange={(event) => setAnchorLocal(event.target.value)} />
            </div>
            <p className="text-xs text-muted">
              System Time = 09:15 + (Current Real Time - Configured Real Time)
            </p>
            <Button variant="outline" size="sm" onClick={saveAnchor}>
              Save Anchor Time
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
