import { Injectable } from '@nestjs/common';

import { ConversationState } from '../../common/enums/conversation-state.enum';
import { parseQuoteMessage } from '../../common/utils/ai-parser.util';
import { detectRegion, UserRegion } from '../../common/utils/region.util';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { LeadsService } from '../leads/leads.service';
import { FlowResponse } from './interfaces/flow-response.interface';

@Injectable()
export class ConversationFlowService {
  constructor(private leadsService: LeadsService) {}

  async processMessage(
    conversation: Conversation,
    message: string,
    waId: string,
  ): Promise<FlowResponse | null> {
    const region = detectRegion(waId);

    switch (conversation.currentState) {
      case ConversationState.MENU:
        return this.handleMenu(message, region);

      case ConversationState.SHOW_MODELS:
      case ConversationState.SHOW_DYNAMICS:
      case ConversationState.SHOW_DELIVERY:
      case ConversationState.SHOW_LOCATION:
      case ConversationState.SHOW_HOW_TO_BUY:
        return this.handlePostInfoMenu(message);

      case ConversationState.CAPTURE_QUOTE_DATA:
        return await this.handleQuoteCapture(message, conversation);

      case ConversationState.OPEN_QUESTION:
        return this.handleOpenQuestion(message);

      case ConversationState.WAITING_HUMAN:
      case ConversationState.HUMAN_HANDOFF:
        return null;

      default:
        return this.showMenu();
    }
  }

  private handleMenu(message: string, region: UserRegion): FlowResponse {
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

      case '5':
        return {
          reply: 'Perfecto 👍 Un asesor te atenderá en breve.',
          nextState: ConversationState.HUMAN_HANDOFF,
        };

      default:
        return this.showMenu();
    }
  }

  private handlePostInfoMenu(message: string): FlowResponse {
    const input = message.trim();

    switch (input) {
      case '1':
        return {
          reply:
            'Gracias por tu pregunta 😊\n\nUn asesor revisará tu mensaje y te responderá pronto.',
          nextState: ConversationState.OPEN_QUESTION,
        };

      case '2':
        return {
          reply: this.quoteInstructions(),
          nextState: ConversationState.CAPTURE_QUOTE_DATA,
        };

      case '3':
        return {
          reply: this.getHowToBuyMessage(),
          additionalReplies: [this.postInfoMenu()],
          nextState: ConversationState.SHOW_HOW_TO_BUY,
        };

      case '4':
        return this.showMenu();

      default:
        return {
          reply: this.postInfoMenu(),
        };
    }
  }

  private async handleQuoteCapture(
    message: string,
    conversation: Conversation,
  ): Promise<FlowResponse> {
    const parsed = await parseQuoteMessage(message);

    if (!parsed || !parsed.quantity || !parsed.product) {
      return {
        reply: `No pude identificar bien los datos de la cotización.

        Un asesor revisará tu mensaje.`,
        nextState: ConversationState.HUMAN_HANDOFF,
      };
    }

    await this.leadsService.createLead({
      conversationId: conversation._id,
      name: parsed.name || 'Cliente',
      quantity: parsed.quantity,
      product: parsed.product,
    });

    return {
      reply: `¡Perfecto! 🙌

    Tu solicitud de cotización fue recibida.

    Un asesor revisará tu pedido y te contactará en breve.`,
      nextState: ConversationState.WAITING_HUMAN,
    };
  }

  private handleOpenQuestion(message: string): FlowResponse {
    return {
      reply:
        'Gracias por tu pregunta 😊\n\nUn asesor revisará tu mensaje y te responderá pronto.',
      nextState: ConversationState.WAITING_HUMAN,
    };
  }

  private showMenu(): FlowResponse {
    return {
      reply: `¡Hola! 😊 gracias por tu interés en nuestras cosmetiqueras.
    Somos fabricantes y tenemos precio de mayoreo desde 25 piezas..

Para ayudarte más rápido, elige una opción:

1️⃣ Modelos y precios

2️⃣ Dinámica de compra

3️⃣ Tiempos de entrega

4️⃣ Ubicación

5️⃣ Hablar con un asesor`,
      nextState: ConversationState.MENU,
    };
  }

  private postInfoMenu(): string {
    return `¿Cómo te gustaría continuar? 😊

1️⃣ Tengo una duda

2️⃣ Generar cotización

3️⃣ Como comprar

4️⃣ Volver al menú`;
  }

  private quoteInstructions(): string {
    return `
Perfecto 🙌

Para enviarte tu cotización compártenos en un solo mensaje:

• Nombre
• Modelo y colot
• cantidad de piezas

Ejemplo:

"Laura Mendez,
cuadrada negro 50 piezas
cuadrada azul 10 piezas"
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
      📦 *Stock disponible*
      • Entrega inmediata según disponibilidad  

      🛠 *Producción y envío*
      • Tiempo estimado: 4 a 10 días  
      • Puede variar según cantidad, ubicación o personalización  

      `;
  }
  private getLocationMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `
    📍 Nuestra matriz se encuentra en Acolman, Estado de México.

    Sin embargo, contamos con un distribuidor en Nuevo León 😊  
    • Stock disponible  
    • Entrega inmediata según disponibilidad  

    No contamos con tienda física, trabajamos directamente bajo disponibilidad y entrega, lo que nos permite ofrecer mejor precio y rapidez 🚀
    `;
    }

    return `
    📍 Nuestra matriz se encuentra en Acolman, Estado de México.

    • Realizamos envíos a toda la República 🇲🇽  
    • Producción y envío según disponibilidad  

    No contamos con tienda física, trabajamos directamente bajo pedido y envío, lo que nos permite ofrecer mejor precio 😊
    `;
  }

  private getModelsMessage(region: UserRegion): string {
    if (region === 'monterrey') {
      return `Aquí te compartimos los modelos disponibles para Monterrey 👇`;
    }

    return `Aquí te compartimos nuestros modelos y precios disponibles 👇`;
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
      📦 *Sobre stock disponible*
      • Entrega inmediata según disponibilidad  
      • Punto intermedio para entrega  
      • En compras mayores a 80 piezas se solicita anticipo  

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

  private getHowToBuyMessage(): string {
    return `📌 ¿Cómo comprar?
    
1️⃣ Elige modelo, color y cantidad
2️⃣ Genera una cotizacion o habla con un    
   agente
3️⃣ Se confirma disponibilidad
4️⃣ Se realiza anticipo (Si es necesario)
5️⃣ Se agenda entrega/envío`;
  }
}
