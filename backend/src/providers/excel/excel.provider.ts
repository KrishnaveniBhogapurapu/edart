import { Injectable } from '@nestjs/common';
import { CandleInput } from '@candle/engine';

@Injectable()
export class ExcelCandleProvider {
  normalizeRows(rows: Array<Record<string, unknown>>): CandleInput[] {
    const normalized: CandleInput[] = [];

    for (const row of rows) {
      const timeValue = row.time ?? row.Time ?? row.timestamp ?? row.Timestamp;
      const open = row.open ?? row.Open;
      const high = row.high ?? row.High;
      const low = row.low ?? row.Low;
      const close = row.close ?? row.Close;

      if (!timeValue || open === undefined || high === undefined || low === undefined || close === undefined) {
        continue;
      }

      normalized.push({
        time: String(timeValue),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
      });
    }

    return normalized;
  }
}
