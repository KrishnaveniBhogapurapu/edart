import { Injectable } from '@nestjs/common';
import { CandleInput, CandleInterval, VariableConfig } from '@candle/engine';
import { MockCandleProvider } from '../../providers/mock/mock.provider.js';
import { ZerodhaCandleProvider } from '../../providers/zerodha/zerodha.provider.js';
import { CandleAggregatorService } from '../../runtime/aggregator/candle-aggregator.service.js';
import { MarketClockService } from '../../runtime/clock/market-clock.service.js';
import { EngineRunnerService } from '../../runtime/engine/engine-runner.service.js';
import { SessionRuntimeService } from '../../runtime/session/session-runtime.service.js';
import { WorkspaceConfigService } from '../config/workspace-config.service.js';
import { ZerodhaService } from '../zerodha/zerodha.service.js';

@Injectable()
export class CandlesService {
  constructor(
    private readonly workspaceConfigService: WorkspaceConfigService,
    private readonly mockCandleProvider: MockCandleProvider,
    private readonly zerodhaService: ZerodhaService,
    private readonly zerodhaCandleProvider: ZerodhaCandleProvider,
    private readonly engineRunnerService: EngineRunnerService,
    private readonly marketClockService: MarketClockService,
    private readonly sessionRuntimeService: SessionRuntimeService,
    private readonly candleAggregatorService: CandleAggregatorService,
  ) {}

  async getComputedSnapshot(userId: string) {
    const workspace = (await this.workspaceConfigService.getWorkspace(userId)) as Record<string, any>;
    const interval = (workspace.interval ?? '3m') as CandleInterval;
    const mode = workspace.mode ?? 'MOCK';

    const times = this.marketClockService.getSessionTimes(
      {
        marketStartTime: workspace.session?.marketStartTime ?? '09:15',
        timezone: workspace.session?.timezone ?? 'Asia/Kolkata',
        anchorRealTime: workspace.session?.anchorRealTime ?? undefined,
      },
      interval,
    );

    const candles = await this.loadCandlesForWorkspace(userId, workspace);
    const result = this.engineRunnerService.run(candles, (workspace.variables ?? []) as VariableConfig[]);

    return {
      mode,
      interval,
      status: {
        realTime: times.realTime,
        systemTime: times.systemTime,
      },
      rows: result.rows,
      sessionValues: result.sessionValues,
      errors: result.errors,
      availableCount: candles.length,
    };
  }

  async getComputedDelta(userId: string) {
    const snapshot = await this.getComputedSnapshot(userId);
    const state = this.sessionRuntimeService.get(userId);

    const deltas = this.candleAggregatorService.deltaByCount(snapshot.rows, state.lastEmittedCount);
    const signature = `${snapshot.mode}:${snapshot.interval}:${snapshot.availableCount}`;

    this.sessionRuntimeService.update(userId, {
      lastEmittedCount: snapshot.rows.length,
      lastSignature: signature,
    });

    return {
      ...snapshot,
      delta: deltas,
      hasChanges: deltas.length > 0 || signature !== state.lastSignature,
    };
  }

  computeAdhoc(candles: CandleInput[], variables: VariableConfig[]) {
    return this.engineRunnerService.run(candles, variables);
  }

  private async loadCandlesForWorkspace(userId: string, workspace: Record<string, any>): Promise<CandleInput[]> {
    const mode = workspace.mode ?? 'MOCK';
    const interval = (workspace.interval ?? '3m') as CandleInterval;

    if (mode === 'MOCK') {
      const all = await this.mockCandleProvider.getCandles(interval);
      const times = this.marketClockService.getSessionTimes(
        {
          marketStartTime: workspace.session?.marketStartTime ?? '09:15',
          timezone: workspace.session?.timezone ?? 'Asia/Kolkata',
          anchorRealTime: workspace.session?.anchorRealTime ?? undefined,
        },
        interval,
      );

      // Candle close rule: candle at T becomes available at T + interval.
      return all.slice(0, Math.max(0, times.completedCount));
    }

    if (mode === 'API') {
      const api = workspace.api ?? {};
      if (!api.instrumentToken || !api.dateFrom || !api.dateTo) {
        return [];
      }

      const response = await this.zerodhaService.fetchHistorical(userId, {
        instrumentToken: String(api.instrumentToken),
        interval,
        from: String(api.dateFrom),
        to: String(api.dateTo),
        user_id: api.user_id ? String(api.user_id) : undefined,
      });

      return this.zerodhaCandleProvider.normalizeHistoricalResponse(response.candles as unknown[][]);
    }

    return [];
  }
}

