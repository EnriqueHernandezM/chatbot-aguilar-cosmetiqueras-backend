import { ConversationState } from '../../../common/enums/conversation-state.enum';
import { FlowConfig, FlowMessage } from '../interfaces/flow-config.interface';

const emoji = {
  smile: '😊',
  hands: '🙌',
  box: '📦',
  tools: '🛠',
  pin: '📍',
  rocket: '🚀',
  mexico: '🇲🇽',
  down: '👇',
  note: '📌',
  sparkle: '✨',
  one: '1️⃣',
  two: '2️⃣',
  three: '3️⃣',
  four: '4️⃣',
  five: '5️⃣',
};

const postInfoMenu = `Envíanos tu consulta o elige cómo te gustaría continuar.

${emoji.one} Cómo comprar

${emoji.two} Cotizar mi pedido

${emoji.three} Volver al menú`;

const personalizedAttentionReply = `Gracias ${emoji.smile}

Hemos recibido tu mensaje y en un momento recibirás atención personalizada.`;

const mainMenu: FlowMessage = ({ region }) => {
  const minimumPieces = region === 'monterrey' ? 25 : 30;

  return `¡Hola! ${emoji.smile} Gracias por tu interés.

${emoji.sparkle} Somos fabricantes y distribuidores.
${emoji.box} Venta por mayoreo desde ${minimumPieces} piezas.

Escríbenos tu consulta o utiliza nuestro menú enviando el número correspondiente.

${emoji.one} Modelos y precios

${emoji.two} Dinámica de compra

${emoji.three} Tiempos de entrega

${emoji.four} Ubicación`;
};

const modelsMessage: FlowMessage = ({ region }) => {
  if (region === 'monterrey') {
    return `Te comparto nuestros modelos más vendidos ${emoji.down}`;
  }

  return `Te compartimos nuestros modelos más vendidos ${emoji.down}`;
};

const dynamicsMessage: FlowMessage = ({ region }) => {
  if (region === 'monterrey') {
    return `
     ${emoji.box} *Sobre stock disponible*
      • Entrega inmediata según disponibilidad
      • Punto intermedio para entrega
      • En compras mayores a 80 piezas
         se solicita anticipo

      ${emoji.tools} *Sobre pedido*
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 4 a 10 días
      • Envíos a toda la República ${emoji.mexico}

      ${'🎨'} *Personalización*
      • Envíanos tu idea o diseño
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 8 a 10 días
      `;
  }

  return `
      ${emoji.tools} *Trabajamos sobre pedido*
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 4 a 10 días
      • Envíos a toda la República ${emoji.mexico}

      ${'🎨'} *Personalización*
      • Envíanos tu idea o diseño
      • Anticipo de $500 para iniciar producción
      • Tiempo de producción: 8 a 10 días
      `;
};

const deliveryMessage: FlowMessage = ({ region }) => {
  if (region === 'monterrey') {
    return `
      ${emoji.box} *Stock disponible*
      • Entrega inmediata según disponibilidad, puede ser en persona o uber envios

      ${emoji.tools} *Sobre pedido*
      • Tiempo de producción: 4 a 7 días

      `;
  }

  return `
      ${emoji.tools} *Producción y envío*
      • Tiempo estimado: 4 a 10 días
      • Puede variar según cantidad, ubicación o
        carga de trabajo y personalización

      `;
};

const locationMessage: FlowMessage = ({ region }) => {
  if (region === 'monterrey') {
    return `
    ${emoji.pin} Nuestra matriz se encuentra en Tezoyuca, Estado de México.

    Sin embargo, contamos con un distribuidor en Nuevo León ${emoji.smile}
    • Stock disponible
    • Entrega inmediata según disponibilidad

    No contamos con tienda física, trabajamos directamente bajo disponibilidad y entrega, lo que nos permite ofrecer mejor precio y rapidez ${emoji.rocket}
    `;
  }

  return `
    ${emoji.pin} Nuestra matriz se encuentra en Tezoyuca, Estado de México.

    • Realizamos envíos a toda la República ${emoji.mexico}
    • Producción y envío según disponibilidad

    No contamos con tienda física, trabajamos directamente bajo pedido y envío, lo que nos permite ofrecer mejor precio ${emoji.smile}
    `;
};

const howToBuyMessage = `${emoji.note} ¿Cómo comprar?

${emoji.one} Elige modelo, color y cantidad
${emoji.two} Genera una cotizacion o habla con un
   agente
${emoji.three} Se confirma disponibilidad de materiales
${emoji.four} Se realiza anticipo
${emoji.five} Se agenda entrega/envío`;

const quoteInstructions = `
Perfecto ${emoji.hands}

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

const personalizedAttention = {
  reply: personalizedAttentionReply,
  nextState: ConversationState.WAITING_HUMAN,
};

const mainMenuResponse = {
  reply: mainMenu,
  nextState: ConversationState.MENU,
};

const postInfoStep = (
  state: ConversationState,
  entryResponse?: {
    reply: FlowMessage;
    additionalReplies?: FlowMessage[];
  },
) => ({
  state,
  type: 'menu' as const,
  ...(entryResponse
    ? {
        entryResponse: {
          ...entryResponse,
          nextState: state,
        },
      }
    : {}),
  options: {
    '1': {
      nextState: ConversationState.SHOW_HOW_TO_BUY,
    },
    '2': {
      reply: quoteInstructions,
      nextState: ConversationState.CAPTURE_QUOTE_DATA,
    },
    '3': mainMenuResponse,
  },
  fallback: personalizedAttention,
});

export const hmImpulsoDigitalFlowConfig: FlowConfig = {
  initialState: ConversationState.MENU,
  fallbackState: ConversationState.MENU,
  steps: {
    [ConversationState.MENU]: {
      state: ConversationState.MENU,
      type: 'menu',
      options: {
        '1': {
          nextState: ConversationState.SHOW_MODELS,
        },
        '2': {
          nextState: ConversationState.SHOW_DYNAMICS,
        },
        '3': {
          nextState: ConversationState.SHOW_DELIVERY,
        },
        '4': {
          nextState: ConversationState.SHOW_LOCATION,
        },
      },
      initialFallback: mainMenuResponse,
      fallback: personalizedAttention,
    },
    [ConversationState.SHOW_MODELS]: postInfoStep(
      ConversationState.SHOW_MODELS,
      {
        reply: modelsMessage,
        additionalReplies: [postInfoMenu],
      },
    ),
    [ConversationState.SHOW_DYNAMICS]: postInfoStep(
      ConversationState.SHOW_DYNAMICS,
      {
        reply: dynamicsMessage,
        additionalReplies: [postInfoMenu],
      },
    ),
    [ConversationState.SHOW_DELIVERY]: postInfoStep(
      ConversationState.SHOW_DELIVERY,
      {
        reply: deliveryMessage,
        additionalReplies: [postInfoMenu],
      },
    ),
    [ConversationState.SHOW_LOCATION]: postInfoStep(
      ConversationState.SHOW_LOCATION,
      {
        reply: locationMessage,
        additionalReplies: [postInfoMenu],
      },
    ),
    [ConversationState.SHOW_HOW_TO_BUY]: postInfoStep(
      ConversationState.SHOW_HOW_TO_BUY,
      {
        reply: howToBuyMessage,
        additionalReplies: [postInfoMenu],
      },
    ),
    [ConversationState.POST_INFO_MENU]: postInfoStep(
      ConversationState.POST_INFO_MENU,
    ),
    [ConversationState.CAPTURE_QUOTE_DATA]: {
      state: ConversationState.CAPTURE_QUOTE_DATA,
      type: 'capture_quote_data',
      invalidQuoteResponse: {
        reply: `Tu solicitud necesita algunos detalles adicionales ${emoji.smile}.
      En breve te ayudaremos a completar tu cotización..`,
        nextState: ConversationState.HUMAN_HANDOFF,
      },
      successResponse: {
        reply: `¡Perfecto! ${emoji.hands}

    Tu solicitud de cotización ya fue recibida.
    En breve nos pondremos en contacto contigo.`,
        nextState: ConversationState.WAITING_HUMAN,
      },
    },
    [ConversationState.OPEN_QUESTION]: {
      state: ConversationState.OPEN_QUESTION,
      type: 'open_question',
      response: {
        reply: `¡Gracias! ${emoji.smile}

Revisaremos tu mensaje y te responderemos en breve.`,
        nextState: ConversationState.WAITING_HUMAN,
      },
    },
    [ConversationState.WAITING_HUMAN]: {
      state: ConversationState.WAITING_HUMAN,
      type: 'human_handoff',
    },
    [ConversationState.HUMAN_HANDOFF]: {
      state: ConversationState.HUMAN_HANDOFF,
      type: 'human_handoff',
    },
  },
};
