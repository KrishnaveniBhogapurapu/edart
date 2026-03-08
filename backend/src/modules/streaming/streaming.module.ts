import { Module } from '@nestjs/common';
import { CandlesModule } from '../candles/candles.module.js';
import { StreamingController } from './streaming.controller.js';
import { StreamingService } from './streaming.service.js';

@Module({
  imports: [CandlesModule],
  controllers: [StreamingController],
  providers: [StreamingService],
})
export class StreamingModule {}
