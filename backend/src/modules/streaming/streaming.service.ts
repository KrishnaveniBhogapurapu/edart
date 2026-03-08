import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CandlesService } from '../candles/candles.service.js';

export interface StreamEvent {
  type: 'session.status' | 'candles.snapshot' | 'candles.delta' | 'engine.error';
  data: unknown;
}

@Injectable()
export class StreamingService {
  constructor(private readonly candlesService: CandlesService) {}

  createUserStream(userId: string): Observable<StreamEvent> {
    return new Observable<StreamEvent>((subscriber) => {
      let closed = false;
      let isFirst = true;

      const sendTick = async () => {
        if (closed) {
          return;
        }

        try {
          const snapshot = await this.candlesService.getComputedSnapshot(userId);

          subscriber.next({
            type: 'session.status',
            data: {
              mode: snapshot.mode,
              interval: snapshot.interval,
              status: snapshot.status,
            },
          });

          const shouldEmitCandles =
            snapshot.mode !== 'API' || this.shouldEmitApiBoundary(snapshot.interval as '3m' | '5m' | '15m');

          if (shouldEmitCandles || isFirst) {
            const delta = await this.candlesService.getComputedDelta(userId);

            if (isFirst) {
              subscriber.next({
                type: 'candles.snapshot',
                data: delta.rows,
              });
            }

            if (delta.hasChanges) {
              subscriber.next({
                type: 'candles.delta',
                data: delta.delta,
              });
            }
          }

          if (snapshot.errors.length) {
            subscriber.next({
              type: 'engine.error',
              data: snapshot.errors,
            });
          }

          isFirst = false;
        } catch (error) {
          subscriber.next({
            type: 'engine.error',
            data: {
              message: error instanceof Error ? error.message : 'Unknown streaming error',
            },
          });
        }
      };

      void sendTick();
      const timer = setInterval(() => {
        void sendTick();
      }, 5000);

      return () => {
        closed = true;
        clearInterval(timer);
      };
    });
  }

  private shouldEmitApiBoundary(interval: '3m' | '5m' | '15m'): boolean {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();

    if (seconds < 10 || seconds > 59) {
      return false;
    }

    const modulo = interval === '3m' ? 3 : interval === '5m' ? 5 : 15;
    return minutes % modulo === 0;
  }
}
