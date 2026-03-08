import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type WorkspaceConfigDocument = HydratedDocument<WorkspaceConfig>;

@Schema({ _id: false })
class SessionConfigEntity {
  @Prop({ default: '09:15' })
  marketStartTime!: string;

  @Prop({ default: 'Asia/Kolkata' })
  timezone!: string;

  @Prop({ type: String, default: null })
  anchorRealTime!: string | null;
}

@Schema({ timestamps: true })
export class WorkspaceConfig {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ['MOCK', 'API', 'EXCEL'], default: 'MOCK' })
  mode!: 'MOCK' | 'API' | 'EXCEL';

  @Prop({ enum: ['3m', '5m', '15m'], default: '3m' })
  interval!: '3m' | '5m' | '15m';

  @Prop({ type: SessionConfigEntity, default: () => ({}) })
  session!: SessionConfigEntity;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  variables!: unknown[];

  @Prop({ type: Types.ObjectId, ref: 'VariableCollection', default: null })
  activeVariableCollectionId!: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  api!: Record<string, unknown>;
}

export const WorkspaceConfigSchema = SchemaFactory.createForClass(WorkspaceConfig);

