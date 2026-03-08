import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { InstrumentsQueryDto } from './dto/instruments-query.dto.js';
import { SaveZerodhaSessionDto } from './dto/save-zerodha-session.dto.js';
import { ZerodhaService } from './zerodha.service.js';

@UseGuards(JwtAuthGuard)
@Controller('zerodha')
export class ZerodhaController {
  constructor(private readonly zerodhaService: ZerodhaService) {}

  @Post('session')
  saveSession(
    @CurrentUser() user: { sub: string },
    @Body() body: SaveZerodhaSessionDto,
  ) {
    return this.zerodhaService.saveSession(user.sub, body);
  }

  @Get('session')
  getSession(@CurrentUser() user: { sub: string }) {
    return this.zerodhaService.getSessionStatus(user.sub);
  }

  @Get('instruments')
  async getInstruments(@Query() query: InstrumentsQueryDto): Promise<unknown[]> {
    return this.zerodhaService.fetchInstruments(query.q);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: { sub: string },
    @Query() query: HistoryQueryDto,
  ) {
    return this.zerodhaService.fetchHistorical(user.sub, query);
  }
}

