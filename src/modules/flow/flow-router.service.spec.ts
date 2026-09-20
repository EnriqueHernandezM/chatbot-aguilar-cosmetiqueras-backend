import { ConversationState } from '../../common/enums/conversation-state.enum';
import {
  CaptureQuoteDataHandler,
  HumanHandoffHandler,
  InfoMessageHandler,
  MenuHandler,
  OpenQuestionHandler,
} from './handlers';
import { defaultFlowConfig, flowConfigsByTenantSlug } from './flows';
import { FlowRouterService } from './flow-router.service';
import { TenantSlug } from './tenant-slug.enum';

describe('FlowRouterService', () => {
  let service: FlowRouterService;

  beforeEach(() => {
    service = new FlowRouterService(
      new MenuHandler(),
      new InfoMessageHandler(),
      new CaptureQuoteDataHandler(
        { createLead: jest.fn() } as any,
        { markAsPotentialSale: jest.fn() } as any,
      ),
      new OpenQuestionHandler(),
      new HumanHandoffHandler(),
    );
  });

  it('keeps the default flow starting at MENU for a new conversation', async () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const response = await service.processMessage(
      defaultFlowConfig,
      {
        _id: 'conversation-1',
        currentState: ConversationState.MENU,
        createdAt: now,
        updatedAt: now,
      } as any,
      'Hola',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.MENU,
    });
    expect(response?.reply).toContain('Modelos y precios');
  });

  it('starts otro-tenan at SHOW_MODELS for a new conversation', async () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]!,
      {
        _id: 'conversation-2',
        currentState: ConversationState.MENU,
        createdAt: now,
        updatedAt: now,
      } as any,
      'Hola',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.POST_INFO_MENU,
    });
    expect(response?.reply).toContain('modelos más vendidos');
    expect(response?.reply).not.toContain('Modelos y precios');
    expect(response?.additionalReplies?.[0]).toContain('Cotizar mi pedido');
  });

  it('uses the persisted state after the first interaction', async () => {
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]!,
      {
        _id: 'conversation-3',
        currentState: ConversationState.POST_INFO_MENU,
      } as any,
      '2',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.CAPTURE_QUOTE_DATA,
    });
    expect(response?.reply).toContain('Para enviarte tu cotización');
  });
});
