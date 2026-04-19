import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class FcmToken extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  token: string;

  @Prop({ required: true, trim: true })
  platform: string;

  @Prop({ default: null, trim: true })
  deviceName: string | null;

  @Prop({ default: null, trim: true })
  userAgent: string | null;

  @Prop({ default: null })
  lastUsedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);
