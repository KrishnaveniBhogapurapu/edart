import { Module } from '@nestjs/common';
import { WorkspaceConfigModule } from '../config/workspace-config.module.js';
import { ZerodhaModule } from '../zerodha/zerodha.module.js';
import { CandlesController } from './candles.controller.js';
import { CandlesService } from './candles.service.js';
import { MockCandleProvider } from '../../providers/mock/mock.provider.js';
import { ZerodhaCandleProvider } from '../../providers/zerodha/zerodha.provider.js';
import { EngineRunnerService } from '../../runtime/engine/engine-runner.service.js';
import { MarketClockService } from '../../runtime/clock/market-clock.service.js';
import { SessionRuntimeService } from '../../runtime/session/session-runtime.service.js';
import { CandleAggregatorService } from '../../runtime/aggregator/candle-aggregator.service.js';

@Module({
  imports: [WorkspaceConfigModule, ZerodhaModule],
  controllers: [CandlesController],
  providers: [
    CandlesService,
    MockCandleProvider,
    ZerodhaCandleProvider,
    EngineRunnerService,
    MarketClockService,
    SessionRuntimeService,
    CandleAggregatorService,
  ],
  exports: [CandlesService],
})
export class CandlesModule {}
