import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { ConversationState } from '../../common/enums/conversation-state.enum';
import { parseQuoteMessage } from '../../common/utils/ai-parser.util';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationFlowService } from './conversation-flow.service';

jest.mock('../../common/utils/ai-parser.util', () => ({
  parseQuoteMessage: jest.fn(),
}));

describe('ConversationFlowService', () => {
  let service: ConversationFlowService;
  let leadsService: { createLead: jest.Mock };
  let conversationsService: { markAsPotentialSale: jest.Mock };

  beforeEach(async () => {
    leadsService = {
      createLead: jest.fn(),
    };

    conversationsService = {
      markAsPotentialSale: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationFlowService,
        {
          provide: LeadsService,
          useValue: leadsService,
        },
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
      ],
    }).compile();

    service = module.get<ConversationFlowService>(ConversationFlowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps menu options 1 to 4 routed to their current states', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.MENU,
    } as any;

    await expect(
      service.processMessage(conversation, '1', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.SHOW_MODELS,
    });
    await expect(
      service.processMessage(conversation, '2', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.SHOW_DYNAMICS,
    });
    await expect(
      service.processMessage(conversation, '3', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.SHOW_DELIVERY,
    });
    await expect(
      service.processMessage(conversation, '4', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.SHOW_LOCATION,
    });
  });

  it('shows the main menu when the first message is free text', async () => {
    const now = new Date('2026-06-27T12:00:00.000Z');
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.MENU,
      createdAt: now,
      updatedAt: now,
    } as any;

    const response = await service.processMessage(
      conversation,
      'Me interesa una cosmetiquera personalizada',
      '525511111111',
    );

    expect(response).toMatchObject({
      nextState: ConversationState.MENU,
    });
    expect(response?.reply).toContain('1️⃣ Modelos y precios');
    expect(response?.reply).not.toContain('Atención personalizada');
  });

  it('sends free menu messages to personalized attention after the menu was shown', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.MENU,
      createdAt: new Date('2026-06-27T12:00:00.000Z'),
      updatedAt: new Date('2026-06-27T12:00:02.000Z'),
    } as any;

    const response = await service.processMessage(
      conversation,
      'Me interesa una cosmetiquera personalizada',
      '525511111111',
    );

    expect(response).toEqual({
      reply:
        'Gracias 😊\n\nHemos recibido tu mensaje y en un momento recibirás atención personalizada.',
      nextState: ConversationState.WAITING_HUMAN,
    });
  });

  it('routes the simplified post-info menu options correctly', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.SHOW_MODELS,
    } as any;

    await expect(
      service.processMessage(conversation, '1', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.SHOW_HOW_TO_BUY,
    });
    await expect(
      service.processMessage(conversation, '2', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.CAPTURE_QUOTE_DATA,
    });
    await expect(
      service.processMessage(conversation, '3', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.MENU,
    });
  });

  it('preserves the regional minimum pieces when returning to the main menu', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.SHOW_MODELS,
    } as any;

    const monterreyResponse = await service.processMessage(
      conversation,
      '3',
      '5218111111111',
    );

    expect(monterreyResponse?.reply).toContain(
      'Venta por mayoreo desde 25 piezas.',
    );

    const nationalResponse = await service.processMessage(
      conversation,
      '3',
      '525511111111',
    );

    expect(nationalResponse?.reply).toContain(
      'Venta por mayoreo desde 30 piezas.',
    );
  });

  it('sends free post-info messages to personalized attention', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.SHOW_DELIVERY,
    } as any;

    const response = await service.processMessage(
      conversation,
      'Necesito ayuda con un pedido grande',
      '525511111111',
    );

    expect(response).toEqual({
      reply:
        'Gracias 😊\n\nHemos recibido tu mensaje y en un momento recibirás atención personalizada.',
      nextState: ConversationState.WAITING_HUMAN,
    });
  });

  it('keeps OPEN_QUESTION moving to WAITING_HUMAN', async () => {
    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.OPEN_QUESTION,
    } as any;

    await expect(
      service.processMessage(conversation, 'Tengo otra duda', '525511111111'),
    ).resolves.toMatchObject({
      nextState: ConversationState.WAITING_HUMAN,
    });
  });

  it('creates a lead with location and marks the conversation as potential sale', async () => {
    (parseQuoteMessage as jest.Mock).mockResolvedValue({
      name: 'Laura Mendez',
      quantity: 60,
      product: 'cuadrada roja 30 piezas, cuadrada azul 30 piezas',
      location: 'Miguel Hidalgo Cdmx',
    });

    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.CAPTURE_QUOTE_DATA,
    } as any;

    const response = await service.processMessage(
      conversation,
      'Laura Mendez',
      '525511111111',
    );

    expect(leadsService.createLead).toHaveBeenCalledWith({
      conversationId: conversation._id,
      name: 'Laura Mendez',
      quantity: 60,
      product: 'cuadrada roja 30 piezas, cuadrada azul 30 piezas',
      location: 'Miguel Hidalgo Cdmx',
    });
    expect(conversationsService.markAsPotentialSale).toHaveBeenCalledWith(
      String(conversation._id),
    );
    expect(response).toEqual({
      reply: `¡Perfecto! 🙌

    Tu solicitud de cotización ya fue recibida.
    En breve nos pondremos en contacto contigo.`,
      nextState: ConversationState.WAITING_HUMAN,
    });
  });

  it('keeps compatibility when location is missing', async () => {
    (parseQuoteMessage as jest.Mock).mockResolvedValue({
      name: 'Laura Mendez',
      quantity: 30,
      product: 'cuadrada roja 30 piezas',
      location: null,
    });

    const conversation = {
      _id: new Types.ObjectId(),
      currentState: ConversationState.CAPTURE_QUOTE_DATA,
    } as any;

    await service.processMessage(
      conversation,
      'Laura Mendez, cuadrada roja 30 piezas',
      '525511111111',
    );

    expect(leadsService.createLead).toHaveBeenCalledWith({
      conversationId: conversation._id,
      name: 'Laura Mendez',
      quantity: 30,
      product: 'cuadrada roja 30 piezas',
      location: null,
    });
    expect(conversationsService.markAsPotentialSale).toHaveBeenCalledWith(
      String(conversation._id),
    );
  });
});
