import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';

export interface ConversationLastMessage {
  id: string;
  from: MessageFrom;
  type: MessageType;
  content: string | string[];
  createdAt: Date;
}
