import { Injectable } from '@nestjs/common';
import { SessionConfig } from '@candle/engine';
import {
  deriveCompletedCandleCount,
  deriveSystemTime,
  formatClock,
} from '../../common/utils/time.util.js';

@Injectable()
export class MarketClockService {
  getSessionTimes(session: SessionConfig, interval: '3m' | '5m' | '15m') {
    const realNow = new Date();
    const realTime = formatClock(realNow, session.timezone || 'Asia/Kolkata');

    const systemNow = session.anchorRealTime
      ? deriveSystemTime(realNow, session.anchorRealTime, session.marketStartTime || '09:15')
      : realNow;

    const systemTime = formatClock(systemNow, session.timezone || 'Asia/Kolkata');
    const completedCount = deriveCompletedCandleCount(
      systemNow,
      session.marketStartTime || '09:15',
      interval,
    );

    return {
      realNow,
      systemNow,
      realTime,
      systemTime,
      completedCount,
    };
  }
}
