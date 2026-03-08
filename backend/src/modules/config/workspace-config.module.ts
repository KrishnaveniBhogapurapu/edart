import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WorkspaceConfig,
  WorkspaceConfigSchema,
} from '../../database/schemas/workspace-config.schema.js';
import { WorkspaceConfigController } from './workspace-config.controller.js';
import { WorkspaceConfigService } from './workspace-config.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceConfig.name, schema: WorkspaceConfigSchema },
    ]),
  ],
  controllers: [WorkspaceConfigController],
  providers: [WorkspaceConfigService],
  exports: [WorkspaceConfigService],
})
export class WorkspaceConfigModule {}
