import { ConversationState } from '../../../common/enums/conversation-state.enum';
import {
  createCurrentFlowConfig,
  currentFlowMessages,
} from './current-flow.factory';

export const otroTenanFlowConfig = createCurrentFlowConfig({
  initialState: ConversationState.SHOW_MODELS,
  steps: {
    [ConversationState.SHOW_MODELS]: {
      state: ConversationState.SHOW_MODELS,
      type: 'info_message',
      response: {
        reply: currentFlowMessages.models,
        additionalReplies: [currentFlowMessages.postInfoMenu],
        nextState: ConversationState.POST_INFO_MENU,
      },
    },
  },
});
