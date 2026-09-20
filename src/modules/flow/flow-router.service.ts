import { Injectable } from '@nestjs/common';

import { ConversationState } from '../../common/enums/conversation-state.enum';
import { detectRegion } from '../../common/utils/region.util';
import { Conversation } from '../conversations/schemas/conversation.schema';
import {
  FlowConfig,
  FlowMessageContext,
  FlowStepConfig,
  FlowStepHandler,
  MenuFlowStep,
} from './interfaces/flow-config.interface';
import { FlowResponse } from './interfaces/flow-response.interface';
import {
  CaptureQuoteDataHandler,
  HumanHandoffHandler,
  InfoMessageHandler,
  MenuHandler,
  OpenQuestionHandler,
} from './handlers';
import { resolveFlowResponse } from './handlers/flow-message.util';

@Injectable()
export class FlowRouterService {
  private readonly handlersByType: Record<string, FlowStepHandler>;

  constructor(
    menuHandler: MenuHandler,
    infoMessageHandler: InfoMessageHandler,
    captureQuoteDataHandler: CaptureQuoteDataHandler,
    openQuestionHandler: OpenQuestionHandler,
    humanHandoffHandler: HumanHandoffHandler,
  ) {
    const handlers = [
      menuHandler,
      infoMessageHandler,
      captureQuoteDataHandler,
      openQuestionHandler,
      humanHandoffHandler,
    ];

    this.handlersByType = handlers.reduce<Record<string, FlowStepHandler>>(
      (handlersByType, handler) => ({
        ...handlersByType,
        [handler.type]: handler,
      }),
      {},
    );
  }

  processMessage(
    flowConfig: FlowConfig,
    conversation: Conversation,
    message: string,
    waId: string,
  ): Promise<FlowResponse | null> | FlowResponse | null {
    const context: FlowMessageContext = {
      conversation,
      message,
      region: detectRegion(waId),
      waId,
    };
    const currentState = this.resolveCurrentState(flowConfig, conversation);
    const step = flowConfig.steps[currentState];

    if (!step) {
      return this.resolveFallbackResponse(flowConfig, context);
    }

    return this.handleStep(step, context);
  }

  private resolveCurrentState(
    flowConfig: FlowConfig,
    conversation: Conversation,
  ) {
    if (
      flowConfig.initialState !== conversation.currentState &&
      this.isInitialConversationInteraction(conversation)
    ) {
      return flowConfig.initialState;
    }

    return conversation.currentState;
  }

  private isInitialConversationInteraction(conversation: Conversation) {
    const timestamps = conversation as Conversation & {
      createdAt?: Date;
      updatedAt?: Date;
    };

    if (!timestamps.createdAt || !timestamps.updatedAt) {
      return false;
    }

    return (
      Math.abs(
        timestamps.updatedAt.getTime() - timestamps.createdAt.getTime(),
      ) < 1000
    );
  }

  private handleStep(
    step: FlowStepConfig,
    context: FlowMessageContext,
  ): Promise<FlowResponse | null> | FlowResponse | null {
    const handler = this.handlersByType[step.type];

    if (!handler) {
      return null;
    }

    return handler.handle(step, context);
  }

  private resolveFallbackResponse(
    flowConfig: FlowConfig,
    context: FlowMessageContext,
  ) {
    const fallbackStep = flowConfig.steps[flowConfig.fallbackState];

    if (fallbackStep?.type !== 'menu') {
      return null;
    }

    const menuStep = fallbackStep as MenuFlowStep;
    const fallbackResponse = menuStep.initialFallback ?? menuStep.fallback;

    return resolveFlowResponse(fallbackResponse, context);
  }
}
