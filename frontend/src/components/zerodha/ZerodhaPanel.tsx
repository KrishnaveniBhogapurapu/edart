import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

interface ZerodhaPanelProps {
  apiConfig: Record<string, unknown>;
  onApiConfigChange: (next: Record<string, unknown>) => void;
}

interface InstrumentRow {
  instrument_token: string;
  tradingsymbol: string;
  name: string;
  exchange: string;
  segment: string;
}

export function ZerodhaPanel({ apiConfig, onApiConfigChange }: ZerodhaPanelProps) {
  const [enctoken, setEnctoken] = useState('');
  const [userId, setUserId] = useState((apiConfig.user_id as string) ?? '');
  const [query, setQuery] = useState('');
  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [status, setStatus] = useState<string>('Not connected');

  const saveSession = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/zerodha/session', {
      enctoken,
      user_id: userId,
    });
    setStatus('Connected');
    onApiConfigChange({ ...apiConfig, user_id: userId });
  };

  const fetchInstruments = async () => {
    const response = await api.get('/zerodha/instruments', {
      params: { q: query },
    });
    setInstruments(response.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zerodha API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form className="space-y-2" onSubmit={saveSession}>
          <Input
            placeholder="enctoken"
            value={enctoken}
            onChange={(event) => setEnctoken(event.target.value)}
          />
          <Input
            placeholder="user_id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
          <Button type="submit" size="sm" className="w-full">
            Save Zerodha Session
          </Button>
        </form>

        <div className="rounded-md border border-border bg-[#f4f8f3] px-3 py-2 text-xs text-muted">
          Status: {status}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Search by symbol, name, exchange"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button variant="outline" size="sm" onClick={fetchInstruments}>
            Fetch Instruments
          </Button>
          <div className="max-h-36 space-y-1 overflow-auto rounded-md border border-border p-2 text-xs">
            {instruments.map((instrument) => (
              <button
                key={instrument.instrument_token}
                className="w-full rounded px-2 py-1 text-left hover:bg-[#eef4ec]"
                onClick={() =>
                  onApiConfigChange({
                    ...apiConfig,
                    instrumentToken: instrument.instrument_token,
                    tradingsymbol: instrument.tradingsymbol,
                    exchange: instrument.exchange,
                    segment: instrument.segment,
                  })
                }
                type="button"
              >
                {instrument.tradingsymbol} ({instrument.exchange})
              </button>
            ))}
            {!instruments.length ? <div className="text-muted">No instruments loaded</div> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={(apiConfig.dateFrom as string) ?? ''}
            onChange={(event) => onApiConfigChange({ ...apiConfig, dateFrom: event.target.value })}
          />
          <Input
            type="date"
            value={(apiConfig.dateTo as string) ?? ''}
            onChange={(event) => onApiConfigChange({ ...apiConfig, dateTo: event.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
