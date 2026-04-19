import { ConversationState } from '../../../common/enums/conversation-state.enum';

export interface FlowResponse {
  reply: string;
  additionalReplies?: string[];
  nextState?: ConversationState;
}
