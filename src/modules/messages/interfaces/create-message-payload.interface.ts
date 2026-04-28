import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';

export interface CreateMessagePayload {
  conversationId: string;
  from: MessageFrom;
  type?: MessageType;
  messageType?: MessageType;
  content: string | string[];
  waMessageId?: string;
  internalNote?: boolean;
}
