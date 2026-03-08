import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type VariableCollectionDocument = HydratedDocument<VariableCollection>;

@Schema({ timestamps: true })
export class VariableCollection {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  variables!: unknown[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const VariableCollectionSchema = SchemaFactory.createForClass(VariableCollection);

VariableCollectionSchema.index({ userId: 1, updatedAt: -1 });
