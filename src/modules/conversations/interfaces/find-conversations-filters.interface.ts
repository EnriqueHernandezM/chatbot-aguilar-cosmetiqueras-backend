import { ConversationStatus } from 'src/common/enums/conversation-status.enum';

export interface FindConversationsFilters {
  status?: ConversationStatus;
  assignedTo?: string;
}
