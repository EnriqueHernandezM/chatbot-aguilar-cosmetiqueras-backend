import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';
import { Types } from 'mongoose';

export interface CreateMessagePayload {
  tenantId?: Types.ObjectId;
  conversationId: string;
  from: MessageFrom;
  type?: MessageType;
  messageType?: MessageType;
  content: string | string[];
  waMessageId?: string;
  internalNote?: boolean;
}
