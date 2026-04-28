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

    Tu solicitud de cotización fue recibida.

    Un asesor revisará tu pedido y te contactará en breve.`,
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
