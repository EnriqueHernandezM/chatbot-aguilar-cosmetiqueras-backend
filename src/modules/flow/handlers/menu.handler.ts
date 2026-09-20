import { Injectable } from '@nestjs/common';

import { Conversation } from '../../conversations/schemas/conversation.schema';
import {
  FlowMessageContext,
  FlowStepHandler,
  MenuFlowStep,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';
import { resolveFlowResponse } from './flow-message.util';

@Injectable()
export class MenuHandler implements FlowStepHandler<MenuFlowStep> {
  readonly type = 'menu' as const;

  handle(step: MenuFlowStep, context: FlowMessageContext): FlowResponse {
    const input = context.message.trim();
    const option = step.options[input];

    if (option) {
      return resolveFlowResponse(option, context);
    }

    if (step.initialFallback && this.isInitialMenuInteraction(context.conversation)) {
      return resolveFlowResponse(step.initialFallback, context);
    }

    return resolveFlowResponse(step.fallback, context);
  }

  private isInitialMenuInteraction(conversation: Conversation): boolean {
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
}
