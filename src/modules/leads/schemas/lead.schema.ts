import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { LeadStatus } from '../../../common/enums/lead-status.enum';

@Schema({ timestamps: true })
export class Lead extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
  })
  conversationId: Types.ObjectId;

  @Prop()
  name: string;

  @Prop()
  quantity: number;

  @Prop()
  product: string;

  @Prop({ default: null })
  location: string | null;

  @Prop({
    type: String,
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
