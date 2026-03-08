import { Injectable } from '@nestjs/common';
import { CandleInput } from '@candle/engine';
import { promises as fs } from 'fs';
import path from 'path';

@Injectable()
export class MockCandleProvider {
  async getCandles(interval: '3m' | '5m' | '15m'): Promise<CandleInput[]> {
    const filename = `${interval}.json`;
    const srcPath = path.resolve(process.cwd(), 'src', 'assets', filename);
    const distPath = path.resolve(process.cwd(), 'dist', 'assets', filename);

    const filePath = await fs
      .access(srcPath)
      .then(() => srcPath)
      .catch(async () => {
        await fs.access(distPath);
        return distPath;
      });

    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CandleInput[];
    return parsed.map((item) => ({
      time: item.time,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: item.volume ? Number(item.volume) : undefined,
      oi: item.oi ? Number(item.oi) : undefined,
    }));
  }
}
