import { ConversationStatus } from 'src/common/enums/conversation-status.enum';

export interface FindConversationsFilters {
  status?: ConversationStatus;
  assignedTo?: string;
  isClosedSale?: string | boolean;
  isPotentialSale?: string | boolean;
  page?: string | number;
  limit?: string | number;
}
