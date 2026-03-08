import { Injectable } from '@nestjs/common';

@Injectable()
export class CandleAggregatorService {
  deltaByCount<T>(rows: T[], lastCount: number): T[] {
    if (lastCount >= rows.length) {
      return [];
    }
    return rows.slice(lastCount);
  }
}
