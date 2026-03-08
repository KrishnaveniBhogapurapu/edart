import { Injectable } from '@nestjs/common';
import { SessionConfig } from '@candle/engine';
import {
  deriveCompletedCandleCount,
  deriveSystemTime,
  formatClock,
} from '../../common/utils/time.util.js';

const IST_TIMEZONE = 'Asia/Kolkata';

@Injectable()
export class MarketClockService {
  getSessionTimes(session: SessionConfig, interval: '3m' | '5m' | '15m') {
    const realNow = new Date();
    const timezone = IST_TIMEZONE;
    const realTime = formatClock(realNow, timezone);

    const systemNow = session.anchorRealTime
      ? deriveSystemTime(
          realNow,
          session.anchorRealTime,
          session.marketStartTime || '09:15',
          timezone,
        )
      : realNow;

    const systemTime = formatClock(systemNow, timezone);
    const completedCount = deriveCompletedCandleCount(
      systemNow,
      session.marketStartTime || '09:15',
      interval,
      timezone,
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
