import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

import { MessageFrom } from '../../../common/enums/message-from.enum';
import { MessageType } from '../../../common/enums/message-type.enum';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    index: true,
  })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
  })
  conversationId: Types.ObjectId;
  @Prop({
    required: false,
    index: true,
  })
  waMessageId: string;
  @Prop({
    type: String,
    enum: MessageFrom,
  })
  from: MessageFrom;

  @Prop({
    type: String,
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Prop({ type: SchemaTypes.Mixed })
  content: string | string[];

  @Prop({
    type: Boolean,
    default: false,
  })
  internalNote: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ tenantId: 1, conversationId: 1, createdAt: -1 });
