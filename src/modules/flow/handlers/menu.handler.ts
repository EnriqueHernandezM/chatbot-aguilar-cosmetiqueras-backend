import { Injectable } from '@nestjs/common';

import { Conversation } from '../../conversations/schemas/conversation.schema';
import {
  FlowMessageContext,
  FlowResponseConfig,
  FlowStepHandler,
  MenuFlowStep,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';
import { resolveFlowResponse } from './flow-message.util';

@Injectable()
export class MenuHandler implements FlowStepHandler<MenuFlowStep> {
  readonly type = 'menu' as const;

  handle(step: MenuFlowStep, context: FlowMessageContext): FlowResponse | null {
    const input = context.message.trim();
    const option = step.options[input];

    if (option?.reply) {
      return resolveFlowResponse(option as FlowResponseConfig, context);
    }

    if (option) {
      return null;
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
