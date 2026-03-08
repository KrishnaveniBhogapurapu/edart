import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ZerodhaSessionDocument = HydratedDocument<ZerodhaSession>;

@Schema({ timestamps: true })
export class ZerodhaSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  encryptedEncToken!: string;

  @Prop({ required: true })
  iv!: string;

  @Prop({ required: true })
  authTag!: string;

  @Prop({ required: true })
  zerodhaUserId!: string;
}

export const ZerodhaSessionSchema = SchemaFactory.createForClass(ZerodhaSession);
