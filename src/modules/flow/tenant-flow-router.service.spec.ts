import {
  defaultFlowConfig,
  flowConfigsByTenantSlug,
} from './flows';
import { TenantFlowRouterService } from './tenant-flow-router.service';
import { TenantSlug } from './tenant-slug.enum';

describe('TenantFlowRouterService', () => {
  const conversation = { _id: 'conversation-1' } as any;
  const message = '1';
  const waId = '5215551234567';

  const flowRouter = {
    processMessage: jest.fn(),
  };

  let service: TenantFlowRouterService;

  beforeEach(() => {
    jest.clearAllMocks();
    flowRouter.processMessage.mockReturnValue({ reply: 'ok' });
    service = new TenantFlowRouterService(flowRouter as any);
  });

  it('routes aguilar-cosmetiqueras to its tenant config', async () => {
    const response = await service.processMessage(
      { slug: TenantSlug.AGUILAR_COSMETIQUERAS } as any,
      conversation,
      message,
      waId,
    );

    expect(response).toEqual({ reply: 'ok' });
    expect(flowRouter.processMessage).toHaveBeenCalledWith(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS],
      conversation,
      message,
      waId,
    );
  });

  it('routes hm-impulso-digital to its tenant config', async () => {
    const response = await service.processMessage(
      { slug: TenantSlug.HM_IMPULSO_DIGITAL } as any,
      conversation,
      message,
      waId,
    );

    expect(response).toEqual({ reply: 'ok' });
    expect(flowRouter.processMessage).toHaveBeenCalledWith(
      flowConfigsByTenantSlug[TenantSlug.HM_IMPULSO_DIGITAL],
      conversation,
      message,
      waId,
    );
  });

  it('routes otro-tenan to its tenant config', async () => {
    const response = await service.processMessage(
      { slug: TenantSlug.OTRO_TENAN } as any,
      conversation,
      message,
      waId,
    );

    expect(response).toEqual({ reply: 'ok' });
    expect(flowRouter.processMessage).toHaveBeenCalledWith(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN],
      conversation,
      message,
      waId,
    );
  });

  it('uses the default config when the slug is not registered', async () => {
    const response = await service.processMessage(
      { slug: 'unknown-tenant' } as any,
      conversation,
      message,
      waId,
    );

    expect(response).toEqual({ reply: 'ok' });
    expect(flowRouter.processMessage).toHaveBeenCalledWith(
      defaultFlowConfig,
      conversation,
      message,
      waId,
    );
  });
});
