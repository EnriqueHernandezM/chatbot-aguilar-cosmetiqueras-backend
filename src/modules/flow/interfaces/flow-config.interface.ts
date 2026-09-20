import { ConversationState } from '../../../common/enums/conversation-state.enum';
import { UserRegion } from '../../../common/utils/region.util';
import { Conversation } from '../../conversations/schemas/conversation.schema';
import { FlowResponse } from './flow-response.interface';

export type FlowStepType =
  | 'menu'
  | 'info_message'
  | 'capture_quote_data'
  | 'open_question'
  | 'human_handoff';

export interface FlowMessageContext {
  conversation: Conversation;
  message: string;
  region: UserRegion;
  waId: string;
}

export type FlowMessage = string | ((context: FlowMessageContext) => string);

export interface FlowResponseConfig {
  reply: FlowMessage;
  additionalReplies?: FlowMessage[];
  nextState?: ConversationState;
}

export interface FlowStepBase {
  state: ConversationState;
  type: FlowStepType;
}

export interface MenuFlowStep extends FlowStepBase {
  type: 'menu';
  options: Record<string, FlowResponseConfig>;
  initialFallback?: FlowResponseConfig;
  fallback: FlowResponseConfig;
}

export interface InfoMessageFlowStep extends FlowStepBase {
  type: 'info_message';
  response: FlowResponseConfig;
}

export interface CaptureQuoteDataFlowStep extends FlowStepBase {
  type: 'capture_quote_data';
  invalidQuoteResponse: FlowResponseConfig;
  successResponse: FlowResponseConfig;
}

export interface OpenQuestionFlowStep extends FlowStepBase {
  type: 'open_question';
  response: FlowResponseConfig;
}

export interface HumanHandoffFlowStep extends FlowStepBase {
  type: 'human_handoff';
}

export type FlowStepConfig =
  | MenuFlowStep
  | InfoMessageFlowStep
  | CaptureQuoteDataFlowStep
  | OpenQuestionFlowStep
  | HumanHandoffFlowStep;

export interface FlowConfig {
  initialState: ConversationState;
  fallbackState: ConversationState;
  steps: Partial<Record<ConversationState, FlowStepConfig>>;
}

export interface FlowStepHandler<
  TStep extends FlowStepConfig = FlowStepConfig,
> {
  readonly type: TStep['type'];
  handle(
    step: TStep,
    context: FlowMessageContext,
  ): FlowResponse | Promise<FlowResponse | null> | null;
}
