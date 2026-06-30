import { Injectable } from '@nestjs/common';

import { ConversationState } from '../../common/enums/conversation-state.enum';
import { parseQuoteMessage } from '../../common/utils/ai-parser.util';
import { detectRegion, UserRegion } from '../../common/utils/region.util';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';
import { FlowResponse } from './interfaces/flow-response.interface';

@Injectable()
export class ConversationFlowService {
  constructor(
    private leadsService: LeadsService,
    private conversationsService: ConversationsService,
  ) {}

  async processMessage(
    conversation: Conversation,
    message: string,
    waId: string,
  ): Promise<FlowResponse | null> {
    const region = detectRegion(waId);

    switch (conversation.currentState) {
      case ConversationState.MENU:
        return this.handleMenu(message, region, conversation);

      case ConversationState.SHOW_MODELS:
      case ConversationState.SHOW_DYNAMICS:
      case ConversationState.SHOW_DELIVERY:
      case ConversationState.SHOW_LOCATION:
      case ConversationState.SHOW_HOW_TO_BUY:
        return this.handlePostInfoMenu(message, region);

      case ConversationState.CAPTURE_QUOTE_DATA:
        return await this.handleQuoteCapture(message, conversation);

      case ConversationState.OPEN_QUESTION:
        return this.handleOpenQuestion(message);

      case ConversationState.WAITING_HUMAN:
      case ConversationState.HUMAN_HANDOFF:
        return null;

      default:
        return this.showMenu(region);
    }
  }

  private handleMenu(
    message: string,
    region: UserRegion,
    conversation: Conversation,
  ): FlowResponse {
    const input = message.trim();

    switch (input) {
      case '1':
        return {
          reply: this.getModelsMessage(region),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_MODELS,
        };

      case '2':
        return {
          reply: this.getDynamicsMessage(region),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_DYNAMICS,
        };

      case '3':
        return {
          reply: this.getDeliveryMessage(region),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_DELIVERY,
        };

      case '4':
        return {
          reply: this.getLocationMessage(region),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_LOCATION,
        };

      default:
        if (this.isInitialMenuInteraction(conversation)) {
          return this.showMenu(region);
        }

        return this.personalizedAttentionResponse();
    }
  }

  private handlePostInfoMenu(
    message: string,
    region: UserRegion,
  ): FlowResponse {
    const input = message.trim();

    switch (input) {
      case '1':
        return {
          reply: this.getHowToBuyMessage(),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_HOW_TO_BUY,
        };

      case '2':
        return {
          reply: this.quoteInstructions(),
          nextState: ConversationState.CAPTURE_QUOTE_DATA,
        };

      case '3':
        return this.showMenu(region);

      default:
        return this.personalizedAttentionResponse();
    }
  }

  private async handleQuoteCapture(
    message: string,
    conversation: Conversation,
  ): Promise<FlowResponse> {
    const parsed = await parseQuoteMessage(message);

    if (!parsed || !parsed.quantity || !parsed.product) {
      return {
        reply: `Tu solicitud necesita algunos detalles adicionales 😊.
      En breve te ayudaremos a completar tu cotización..`,
        nextState: ConversationState.HUMAN_HANDOFF,
      };
    }

    await this.leadsService.createLead({
      conversationId: conversation._id,
      name: parsed.name || 'Cliente',
      quantity: parsed.quantity,
      product: parsed.product,
      location: parsed.location || null,
    });

    await this.conversationsService.markAsPotentialSale(
      String(conversation._id),
    );

    return {
      reply: `¡Perfecto! 🙌

    Tu solicitud de cotización ya fue recibida.
    En breve nos pondremos en contacto contigo.`,
      nextState: ConversationState.WAITING_HUMAN,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleOpenQuestion(message: string): FlowResponse {
    return {
      reply:
        '¡Gracias! 😊\n\nRevisaremos tu mensaje y te responderemos en breve.',
      nextState: ConversationState.WAITING_HUMAN,
    };
  }

  private personalizedAttentionResponse(): FlowResponse {
    return {
      reply:
        'Gracias 😊\n\nHemos recibido tu mensaje y en un momento recibirás atención personalizada.',
      nextState: ConversationState.WAITING_HUMAN,
    };
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

  private showMenu(region: UserRegion = 'national'): FlowResponse {
    const minimumPieces = region === 'monterrey' ? 25 : 30;

    return {
      reply: `¡Hola! 😊 Gracias por tu interés.

✨ Somos fabricantes y distribuidores.
📦 Venta por mayoreo desde ${minimumPieces} piezas.

Escríbenos tu consulta o utiliza nuestro menú enviando el número correspondiente.

1️⃣ Modelos y precios

2️⃣ Dinámica de compra

3️⃣ Tiempos de entrega

4️⃣ Ubicación`,
      nextState: ConversationState.MENU,
    };
  }

  private postInfoMenu(): string {
    return `Envíanos tu consulta o elige cómo te gustaría continuar.

1️⃣ Cómo comprar

2️⃣ Cotizar mi pedido

3️⃣ Volver al menú`;
  }

  private quoteInstructions(): string {
    return `
Perfecto 🙌

Para enviarte tu cotización compártenos en un solo mensaje:

• Nombre
• Modelo y color
• cantidad de piezas
• de donde nos escribes

Ejemplo:

"Laura Mendez,
cuadrada negro 50 piezas
cuadrada azul 10 piezas
Miguel Hidalgo Cdmx"
`;
  }

  private getDeliveryMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `
      📦 *Stock disponible*
      • Entrega inmediata según disponibilidad, puede ser en persona o uber envios

      🛠 *Sobre pedido*
      • Tiempo de producción: 4 a 7 días

      `;
    }

    return `
      🛠 *Producción y envío*
      • Tiempo estimado: 4 a 10 días
      • Puede variar según cantidad, ubicación o
        carga de trabajo y personalización

      `;
  }
  private getLocationMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `
    📍 Nuestra matriz se encuentra en Tezoyuca, Estado de México.

    Sin embargo, contamos con un distribuidor en Nuevo León 😊
    • Stock disponible
    • Entrega inmediata según disponibilidad

    No contamos con tienda física, trabajamos directamente bajo disponibilidad y entrega, lo que nos permite ofrecer mejor precio y rapidez 🚀
    `;
    }

    return `
    📍 Nuestra matriz se encuentra en Tezoyuca, Estado de México.

    • Realizamos envíos a toda la República 🇲🇽
    • Producción y envío según disponibilidad

    No contamos con tienda física, trabajamos directamente bajo pedido y envío, lo que nos permite ofrecer mejor precio 😊
    `;
  }

  private getModelsMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `Te comparto nuestros modelos más vendidos 👇`;
    }

    return `Te compartimos nuestros modelos más vendidos 👇`;
  }

  private getDynamicsMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `
     📦 *Sobre stock disponible*
      • Entrega inmediata según disponibilidad
      • Punto intermedio para entrega
      • En compras mayores a 80 piezas
         se solicita anticipo

      🛠 *Sobre pedido*
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 4 a 10 días
      • Envíos a toda la República 🇲🇽

      🎨 *Personalización*
      • Envíanos tu idea o diseño
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 8 a 10 días
      `;
    }

    return `
      🛠 *Trabajamos sobre pedido*
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 4 a 10 días
      • Envíos a toda la República 🇲🇽

      🎨 *Personalización*
      • Envíanos tu idea o diseño
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 8 a 10 días
      `;
  }

  private getHowToBuyMessage(): string {
    return `📌 ¿Cómo comprar?

1️⃣ Elige modelo, color y cantidad
2️⃣ Genera una cotizacion o habla con un
   agente
3️⃣ Se confirma disponibilidad de materiales
4️⃣ Se realiza anticipo
5️⃣ Se agenda entrega/envío`;
  }
}
