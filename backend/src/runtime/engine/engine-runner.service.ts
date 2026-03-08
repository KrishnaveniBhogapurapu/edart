import { Injectable } from '@nestjs/common';
import { CandleInput, ComputationResult, VariableConfig, computeCandles } from '@candle/engine';

@Injectable()
export class EngineRunnerService {
  run(candles: CandleInput[], variables: VariableConfig[]): ComputationResult {
    return computeCandles({
      candles,
      variables,
    });
  }
}
