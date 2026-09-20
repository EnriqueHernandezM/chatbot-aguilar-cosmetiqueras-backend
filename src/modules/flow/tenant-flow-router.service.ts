import { Injectable } from '@nestjs/common';

import { Conversation } from '../conversations/schemas/conversation.schema';
import { Tenant } from '../tenants/schemas/tenant.schema';
import {
  defaultFlowConfig,
  flowConfigsByTenantSlug,
} from './flows';
import { FlowRouterService } from './flow-router.service';
import { FlowResponse } from './interfaces/flow-response.interface';
import { TenantSlug } from './tenant-slug.enum';

@Injectable()
export class TenantFlowRouterService {
  constructor(private readonly flowRouter: FlowRouterService) {}

  processMessage(
    tenant: Tenant,
    conversation: Conversation,
    message: string,
    waId: string,
  ): Promise<FlowResponse | null> {
    const tenantSlug = tenant.slug?.trim() as TenantSlug | undefined;
    const flowConfig =
      (tenantSlug && flowConfigsByTenantSlug[tenantSlug]) ?? defaultFlowConfig;

    return Promise.resolve(
      this.flowRouter.processMessage(flowConfig, conversation, message, waId),
    );
  }
}
