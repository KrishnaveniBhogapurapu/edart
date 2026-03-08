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

const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function toIstIso(dateTimeLocal: string): string | undefined {
  const match = dateTimeLocal.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute] = match;
  const utcMs =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
    IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function formatDateAsIstInput(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = istDate.getUTCFullYear();
  const mm = pad(istDate.getUTCMonth() + 1);
  const dd = pad(istDate.getUTCDate());
  const hh = pad(istDate.getUTCHours());
  const min = pad(istDate.getUTCMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toIstDateTimeInput(isoOrLocal?: string | null): string {
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

  return formatDateAsIstInput(date);
}

export function SessionConfigPanel({ config, onSave }: SessionConfigPanelProps) {
  const [anchorLocal, setAnchorLocal] = useState<string>(
    toIstDateTimeInput(config.session.anchorRealTime ?? null),
  );

  useEffect(() => {
    setAnchorLocal(toIstDateTimeInput(config.session.anchorRealTime ?? null));
  }, [config.session.anchorRealTime]);

  const saveAnchor = () => {
    onSave({
      session: {
        ...config.session,
        timezone: IST_TIMEZONE,
        anchorRealTime: anchorLocal ? toIstIso(anchorLocal) : undefined,
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

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Timezone</label>
          <Select value={IST_TIMEZONE} disabled>
            <option value={IST_TIMEZONE}>IST (Asia/Kolkata)</option>
          </Select>
        </div>

        {config.mode === 'MOCK' ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                Treat this IST time as 09:15
              </label>
              <Input type="datetime-local" value={anchorLocal} onChange={(event) => setAnchorLocal(event.target.value)} />
            </div>
            <p className="text-xs text-muted">
              System Time (IST) = 09:15 + (Current Real Time in IST - Configured Real Time in IST)
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
