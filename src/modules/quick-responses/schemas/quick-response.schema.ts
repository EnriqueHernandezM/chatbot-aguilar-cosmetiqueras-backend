import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class QuickResponse extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    index: true,
  })
  tenantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Boolean, default: true })
  status: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;
}

export const QuickResponseSchema = SchemaFactory.createForClass(QuickResponse);
