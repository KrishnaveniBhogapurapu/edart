import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ZerodhaSession,
  ZerodhaSessionSchema,
} from '../../database/schemas/zerodha-session.schema.js';
import { ZerodhaController } from './zerodha.controller.js';
import { ZerodhaService } from './zerodha.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ZerodhaSession.name, schema: ZerodhaSessionSchema },
    ]),
  ],
  controllers: [ZerodhaController],
  providers: [ZerodhaService],
  exports: [ZerodhaService],
})
export class ZerodhaModule {}
