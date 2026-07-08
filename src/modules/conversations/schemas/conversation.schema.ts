import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { ConversationStatus } from '../../../common/enums/conversation-status.enum';
import { ConversationState } from '../../../common/enums/conversation-state.enum';
import { ConversationOrigin } from 'src/common/enums/conversation-origin.enum';
import { ConversationLastMessage } from '../interfaces/conversation-last-message.interface';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    index: true,
  })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  waId: string;

  @Prop({
    type: String,
    enum: ConversationState,
    default: ConversationState.MENU,
  })
  currentState: ConversationState;

  @Prop({
    type: String,
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  assignedTo: Types.ObjectId;

  @Prop({
    type: String,
    enum: ConversationOrigin,
  })
  origin: string;
  @Prop({ default: null })
  lockUntil: Date;
  @Prop()
  lastMessageAt: Date;
  @Prop({ default: null })
  lastReadAt: Date;
  @Prop({ type: Number, default: 0 })
  unreadCount: number;
  @Prop({ type: Boolean, default: false })
  isPotentialSale: boolean;
  @Prop({ type: Boolean, default: false })
  isClosedSale: boolean;

  lastMessage?: ConversationLastMessage | null;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ tenantId: 1, waId: 1 });
