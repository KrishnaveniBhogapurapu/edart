import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VariableCollection,
  VariableCollectionSchema,
} from '../../database/schemas/variable-collection.schema.js';
import {
  WorkspaceConfig,
  WorkspaceConfigSchema,
} from '../../database/schemas/workspace-config.schema.js';
import { VariablesController } from './variables.controller.js';
import { VariablesService } from './variables.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VariableCollection.name, schema: VariableCollectionSchema },
      { name: WorkspaceConfig.name, schema: WorkspaceConfigSchema },
    ]),
  ],
  controllers: [VariablesController],
  providers: [VariablesService],
  exports: [VariablesService],
})
export class VariablesModule {}
