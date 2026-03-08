import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CandleInput, VariableConfig } from '@candle/engine';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CandlesService } from './candles.service.js';

@UseGuards(JwtAuthGuard)
@Controller('candles')
export class CandlesController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get('snapshot')
  snapshot(@CurrentUser() user: { sub: string }) {
    return this.candlesService.getComputedSnapshot(user.sub);
  }

  @Get('delta')
  delta(@CurrentUser() user: { sub: string }) {
    return this.candlesService.getComputedDelta(user.sub);
  }

  @Post('compute')
  compute(
    @Body()
    body: {
      candles: CandleInput[];
      variables: VariableConfig[];
    },
  ) {
    return this.candlesService.computeAdhoc(body.candles, body.variables);
  }
}
