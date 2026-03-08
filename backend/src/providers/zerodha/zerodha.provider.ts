import { Injectable } from '@nestjs/common';
import { CandleInput } from '@candle/engine';

@Injectable()
export class ZerodhaCandleProvider {
  normalizeHistoricalResponse(candles: unknown[][]): CandleInput[] {
    return candles
      .map((entry) => {
        const [timestamp, open, high, low, close, volume, oi] = entry;
        return {
          time: new Date(String(timestamp)).toLocaleTimeString('en-IN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          }),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: volume !== undefined ? Number(volume) : undefined,
          oi: oi !== undefined ? Number(oi) : undefined,
        };
      })
      .filter((item) => Number.isFinite(item.open) && Number.isFinite(item.close));
  }
}
