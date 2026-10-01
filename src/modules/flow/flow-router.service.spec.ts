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
import { IntentDetectorService } from './intent-detector.service';
import { TenantSlug } from './tenant-slug.enum';

describe('FlowRouterService', () => {
  let service: FlowRouterService;
  let intentDetector: IntentDetectorService;

  beforeEach(() => {
    intentDetector = new IntentDetectorService();
    service = new FlowRouterService(
      new MenuHandler(),
      new InfoMessageHandler(),
      new CaptureQuoteDataHandler(
        { createLead: jest.fn() } as any,
        { markAsPotentialSale: jest.fn() } as any,
      ),
      new OpenQuestionHandler(),
      new HumanHandoffHandler(),
      intentDetector,
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
      nextState: ConversationState.SHOW_MODELS,
    });
    expect(response?.reply).toContain('modelos');
    expect(response?.reply).not.toContain('Modelos y precios');
    expect(response?.additionalReplies?.[0]).toContain('Cotizar mi pedido');
  });

  it('routes aguilar-cosmetiqueras initial price intent to SHOW_MODELS', async () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS]!,
      {
        _id: 'conversation-4',
        currentState: ConversationState.MENU,
        createdAt: now,
        updatedAt: now,
      } as any,
      'precios porfa',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.SHOW_MODELS,
    });
    expect(response?.reply).toContain('modelos');
    expect(response?.additionalReplies?.[0]).toContain('Cotizar mi pedido');
  });

  it('routes otro-tenan initial price intent with its own config', async () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]!,
      {
        _id: 'conversation-5',
        currentState: ConversationState.MENU,
        createdAt: now,
        updatedAt: now,
      } as any,
      'cuanto cuesta?',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.SHOW_MODELS,
    });
    expect(response?.reply).toContain('modelos');
    expect(response?.additionalReplies?.[0]).toContain('Cotizar mi pedido');
  });

  it('keeps initial intent configs isolated per tenant', () => {
    expect(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS]?.intents,
    ).not.toBe(flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]?.intents);
    expect(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS]
        ?.initialIntentRoutes,
    ).not.toBe(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]?.initialIntentRoutes,
    );
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

describe('FlowRouterService unresolved menu intents', () => {
  let service: FlowRouterService;
  let intentDetector: IntentDetectorService;

  beforeEach(() => {
    intentDetector = new IntentDetectorService();
    service = new FlowRouterService(
      new MenuHandler(),
      new InfoMessageHandler(),
      new CaptureQuoteDataHandler(
        { createLead: jest.fn() } as any,
        { markAsPotentialSale: jest.fn() } as any,
      ),
      new OpenQuestionHandler(),
      new HumanHandoffHandler(),
      intentDetector,
    );
  });

  it('routes an unresolved submenu price intent before using the menu fallback', async () => {
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS]!,
      {
        _id: 'conversation-6',
        currentState: ConversationState.POST_INFO_MENU,
      } as any,
      'qué precios tienen?',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.SHOW_MODELS,
    });
    expect(response?.reply).toContain('modelos');
    expect(response?.additionalReplies?.[0]).toContain('Cotizar mi pedido');
  });

  it('does not use the intent detector when capture quote data owns the message', async () => {
    const detectSpy = jest.spyOn(intentDetector, 'detect');

    await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.AGUILAR_COSMETIQUERAS]!,
      {
        _id: 'conversation-7',
        currentState: ConversationState.CAPTURE_QUOTE_DATA,
      } as any,
      'quiero precio de cuadrada negra 50 piezas',
      '525511111111',
    );

    expect(detectSpy).not.toHaveBeenCalled();
  });

  it('processes submenu options while otro-tenan remains in SHOW_MODELS', async () => {
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]!,
      {
        _id: 'conversation-8',
        currentState: ConversationState.SHOW_MODELS,
      } as any,
      '3',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.MENU,
    });
    expect(response?.reply).toContain('Modelos y precios');
  });

  it('routes unresolved text from otro-tenan SHOW_MODELS through intent detection', async () => {
    const response = await service.processMessage(
      flowConfigsByTenantSlug[TenantSlug.OTRO_TENAN]!,
      {
        _id: 'conversation-9',
        currentState: ConversationState.SHOW_MODELS,
      } as any,
      'donde se ubican?',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.SHOW_LOCATION,
    });
    expect(response?.reply).toContain('Tezoyuca');
  });
});
