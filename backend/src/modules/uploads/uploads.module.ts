import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';
import { ExcelCandleProvider } from '../../providers/excel/excel.provider.js';
import { EngineRunnerService } from '../../runtime/engine/engine-runner.service.js';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, ExcelCandleProvider, EngineRunnerService],
})
export class UploadsModule {}
