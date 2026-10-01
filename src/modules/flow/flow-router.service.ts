import { Injectable } from '@nestjs/common';

import { ConversationState } from '../../common/enums/conversation-state.enum';
import { detectRegion } from '../../common/utils/region.util';
import { Conversation } from '../conversations/schemas/conversation.schema';
import {
  FlowConfig,
  FlowMessageContext,
  FlowResponseConfig,
  FlowStepConfig,
  FlowStepHandler,
  FlowTransitionConfig,
  MenuFlowStep,
} from './interfaces/flow-config.interface';
import { FlowResponse } from './interfaces/flow-response.interface';
import { IntentDetectorService } from './intent-detector.service';
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
    private readonly intentDetector: IntentDetectorService,
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
    const initialIntentResponse = this.resolveInitialIntentResponse(
      flowConfig,
      context,
    );

    if (initialIntentResponse) {
      return initialIntentResponse;
    }

    const currentState = this.resolveCurrentState(flowConfig, conversation);
    const step = flowConfig.steps[currentState];

    if (!step) {
      return this.resolveFallbackResponse(flowConfig, context);
    }

    const initialStateEntryResponse = this.resolveInitialStateEntryResponse(
      currentState,
      step,
      context,
    );

    if (initialStateEntryResponse) {
      return initialStateEntryResponse;
    }

    const menuOptionEntryResponse = this.resolveMenuOptionEntryResponse(
      flowConfig,
      step,
      context,
    );

    if (menuOptionEntryResponse) {
      return menuOptionEntryResponse;
    }

    const unresolvedMenuIntentResponse =
      this.resolveUnresolvedMenuIntentResponse(flowConfig, step, context);

    if (unresolvedMenuIntentResponse) {
      return unresolvedMenuIntentResponse;
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

  private resolveInitialIntentResponse(
    flowConfig: FlowConfig,
    context: FlowMessageContext,
  ): Promise<FlowResponse | null> | FlowResponse | null {
    if (!this.isInitialConversationInteraction(context.conversation)) {
      return null;
    }

    const intent = this.intentDetector.detect(
      context.message,
      flowConfig.intents,
    );

    console.log('[FlowRouter] initial intent detected', {
      intent,
      message: context.message,
      conversationId: String(context.conversation._id),
    });

    if (!intent) {
      console.log(
        '[FlowRouter] no initial intent detected; continuing with tenant initial flow',
        {
          conversationId: String(context.conversation._id),
        },
      );
      return null;
    }

    const route = flowConfig.initialIntentRoutes?.find(
      (route) => route.intent === intent,
    );

    if (!route) {
      console.log(
        '[FlowRouter] initial intent has no route; continuing with tenant initial flow',
        {
          intent,
          conversationId: String(context.conversation._id),
        },
      );
      return null;
    }

    console.log('[FlowRouter] initial intent route selected', {
      intent,
      targetState: route.targetState,
      conversationId: String(context.conversation._id),
    });

    const entryResponse = this.resolveEntryResponseForState(
      flowConfig,
      route.targetState,
      context,
    );

    if (entryResponse) {
      return entryResponse;
    }

    const menuOption = this.resolveMenuOptionForTargetState(
      flowConfig,
      route.targetState,
    );

    if (menuOption?.reply) {
      return resolveFlowResponse(menuOption as FlowResponseConfig, context);
    }

    const step = flowConfig.steps[route.targetState];

    if (!step) {
      return null;
    }

    return this.handleStep(step, context);
  }

  private resolveInitialStateEntryResponse(
    state: ConversationState,
    step: FlowStepConfig,
    context: FlowMessageContext,
  ) {
    if (!this.isInitialConversationInteraction(context.conversation)) {
      return null;
    }

    return this.resolveEntryResponse(step, state, context);
  }

  private resolveMenuOptionEntryResponse(
    flowConfig: FlowConfig,
    step: FlowStepConfig,
    context: FlowMessageContext,
  ) {
    if (step.type !== 'menu') {
      return null;
    }

    const option = step.options[context.message.trim()];

    if (!option?.nextState) {
      return null;
    }

    return this.resolveEntryResponseForState(
      flowConfig,
      option.nextState,
      context,
    );
  }

  private resolveUnresolvedMenuIntentResponse(
    flowConfig: FlowConfig,
    step: FlowStepConfig,
    context: FlowMessageContext,
  ): Promise<FlowResponse | null> | FlowResponse | null {
    if (
      this.isInitialConversationInteraction(context.conversation) ||
      step.type !== 'menu'
    ) {
      return null;
    }

    const input = context.message.trim();

    if (step.options[input]) {
      return null;
    }

    const intent = this.intentDetector.detect(
      context.message,
      flowConfig.intents,
    );

    console.log('[FlowRouter] unresolved menu intent detected', {
      intent,
      currentState: step.state,
      message: context.message,
      conversationId: String(context.conversation._id),
    });

    if (!intent) {
      return null;
    }

    const route = flowConfig.initialIntentRoutes?.find(
      (route) => route.intent === intent,
    );

    if (!route) {
      console.log(
        '[FlowRouter] unresolved menu intent has no route; continuing with menu fallback',
        {
          intent,
          currentState: step.state,
          conversationId: String(context.conversation._id),
        },
      );
      return null;
    }

    console.log('[FlowRouter] unresolved menu intent route selected', {
      intent,
      currentState: step.state,
      targetState: route.targetState,
      conversationId: String(context.conversation._id),
    });

    const entryResponse = this.resolveEntryResponseForState(
      flowConfig,
      route.targetState,
      context,
    );

    if (entryResponse) {
      return entryResponse;
    }

    const menuOption = this.resolveMenuOptionForTargetState(
      flowConfig,
      route.targetState,
    );

    if (menuOption?.reply) {
      return resolveFlowResponse(menuOption as FlowResponseConfig, context);
    }

    const targetStep = flowConfig.steps[route.targetState];

    if (!targetStep) {
      return null;
    }

    return this.handleStep(targetStep, context);
  }

  private resolveMenuOptionForTargetState(
    flowConfig: FlowConfig,
    targetState: ConversationState,
  ): FlowTransitionConfig | null {
    const preferredStates = [flowConfig.initialState, flowConfig.fallbackState];

    for (const state of preferredStates) {
      const option = this.findMenuOptionForTargetState(
        flowConfig.steps[state],
        targetState,
      );

      if (option) {
        return option;
      }
    }

    for (const step of Object.values(flowConfig.steps)) {
      const option = this.findMenuOptionForTargetState(step, targetState);

      if (option) {
        return option;
      }
    }

    return null;
  }

  private findMenuOptionForTargetState(
    step: FlowStepConfig | undefined,
    targetState: ConversationState,
  ): FlowTransitionConfig | null {
    if (step?.type !== 'menu') {
      return null;
    }

    return (
      Object.values(step.options).find(
        (option) => option.nextState === targetState,
      ) ?? null
    );
  }

  private resolveEntryResponseForState(
    flowConfig: FlowConfig,
    state: ConversationState,
    context: FlowMessageContext,
  ) {
    const step = flowConfig.steps[state];

    if (!step) {
      return null;
    }

    return this.resolveEntryResponse(step, state, context);
  }

  private resolveEntryResponse(
    step: FlowStepConfig,
    state: ConversationState,
    context: FlowMessageContext,
  ) {
    if (!step.entryResponse) {
      return null;
    }

    const response = resolveFlowResponse(step.entryResponse, context);

    return {
      ...response,
      nextState: response.nextState ?? state,
    };
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
