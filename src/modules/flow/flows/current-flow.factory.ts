import { ConversationState } from '../../../common/enums/conversation-state.enum';
import {
  FlowConfig,
  FlowMessage,
  FlowStepConfig,
} from '../interfaces/flow-config.interface';

const emoji = {
  smile: '\u{1F60A}',
  hands: '\u{1F64C}',
  box: '\u{1F4E6}',
  tools: '\u{1F6E0}',
  pin: '\u{1F4CD}',
  rocket: '\u{1F680}',
  mexico: '\u{1F1F2}\u{1F1FD}',
  down: '\u{1F447}',
  note: '\u{1F4CC}',
  sparkle: '\u2728',
  one: '1\uFE0F\u20E3',
  two: '2\uFE0F\u20E3',
  three: '3\uFE0F\u20E3',
  four: '4\uFE0F\u20E3',
  five: '5\uFE0F\u20E3',
};

const postInfoMenu = `Env\u00EDanos tu consulta o elige c\u00F3mo te gustar\u00EDa continuar.

${emoji.one} C\u00F3mo comprar

${emoji.two} Cotizar mi pedido

${emoji.three} Volver al men\u00FA`;

const personalizedAttentionReply = `Gracias ${emoji.smile}

Hemos recibido tu mensaje y en un momento recibir\u00E1s atenci\u00F3n personalizada.`;

export const currentFlowMessages = {
  postInfoMenu,
  personalizedAttentionReply,
  mainMenu: (({ region }) => {
    const minimumPieces = region === 'monterrey' ? 25 : 30;

    return `\u00A1Hola! ${emoji.smile} Gracias por tu inter\u00E9s.

${emoji.sparkle} Somos fabricantes y distribuidores.
${emoji.box} Venta por mayoreo desde ${minimumPieces} piezas.

Escr\u00EDbenos tu consulta o utiliza nuestro men\u00FA enviando el n\u00FAmero correspondiente.

${emoji.one} Modelos y precios

${emoji.two} Din\u00E1mica de compra

${emoji.three} Tiempos de entrega

${emoji.four} Ubicaci\u00F3n`;
  }) as FlowMessage,
  models: (({ region }) => {
    if (region === 'monterrey') {
      return `Te comparto nuestros modelos m\u00E1s vendidos ${emoji.down}`;
    }

    return `Te compartimos nuestros modelos m\u00E1s vendidos ${emoji.down}`;
  }) as FlowMessage,
  dynamics: (({ region }) => {
    if (region === 'monterrey') {
      return `
     ${emoji.box} *Sobre stock disponible*
      \u2022 Entrega inmediata seg\u00FAn disponibilidad
      \u2022 Punto intermedio para entrega
      \u2022 En compras mayores a 80 piezas
         se solicita anticipo

      ${emoji.tools} *Sobre pedido*
      \u2022 Anticipo de $500 para iniciar producci\u00F3n
      \u2022 Tiempo de producci\u00F3n: 4 a 10 d\u00EDas
      \u2022 Env\u00EDos a toda la Rep\u00FAblica ${emoji.mexico}

      ?? *Personalizaci\u00F3n*
      \u2022 Env\u00EDanos tu idea o dise\u00F1o
      \u2022 Anticipo de $500 para iniciar producci\u00F3n
      \u2022 Tiempo de producci\u00F3n: 8 a 10 d\u00EDas
      `;
    }

    return `
      ${emoji.tools} *Trabajamos sobre pedido*
      \u2022 Anticipo de $500 para iniciar producci\u00F3n
      \u2022 Tiempo de producci\u00F3n: 4 a 10 d\u00EDas
      \u2022 Env\u00EDos a toda la Rep\u00FAblica ${emoji.mexico}

      ?? *Personalizaci\u00F3n*
      \u2022 Env\u00EDanos tu idea o dise\u00F1o
      \u2022 Anticipo de $500 para iniciar producci\u00F3n
      \u2022 Tiempo de producci\u00F3n: 8 a 10 d\u00EDas
      `;
  }) as FlowMessage,
  delivery: (({ region }) => {
    if (region === 'monterrey') {
      return `
      ${emoji.box} *Stock disponible*
      \u2022 Entrega inmediata seg\u00FAn disponibilidad, puede ser en persona o uber envios

      ${emoji.tools} *Sobre pedido*
      \u2022 Tiempo de producci\u00F3n: 4 a 7 d\u00EDas

      `;
    }

    return `
      ${emoji.tools} *Producci\u00F3n y env\u00EDo*
      \u2022 Tiempo estimado: 4 a 10 d\u00EDas
      \u2022 Puede variar seg\u00FAn cantidad, ubicaci\u00F3n o
        carga de trabajo y personalizaci\u00F3n

      `;
  }) as FlowMessage,
  location: (({ region }) => {
    if (region === 'monterrey') {
      return `
    ${emoji.pin} Nuestra matriz se encuentra en Tezoyuca, Estado de M\u00E9xico.

    Sin embargo, contamos con un distribuidor en Nuevo Le\u00F3n ${emoji.smile}
    \u2022 Stock disponible
    \u2022 Entrega inmediata seg\u00FAn disponibilidad

    No contamos con tienda f\u00EDsica, trabajamos directamente bajo disponibilidad y entrega, lo que nos permite ofrecer mejor precio y rapidez ${emoji.rocket}
    `;
    }

    return `
    ${emoji.pin} Nuestra matriz se encuentra en Tezoyuca, Estado de M\u00E9xico.

    \u2022 Realizamos env\u00EDos a toda la Rep\u00FAblica ${emoji.mexico}
    \u2022 Producci\u00F3n y env\u00EDo seg\u00FAn disponibilidad

    No contamos con tienda f\u00EDsica, trabajamos directamente bajo pedido y env\u00EDo, lo que nos permite ofrecer mejor precio ${emoji.smile}
    `;
  }) as FlowMessage,
  howToBuy: `${emoji.note} \u00BFC\u00F3mo comprar?

${emoji.one} Elige modelo, color y cantidad
${emoji.two} Genera una cotizacion o habla con un
   agente
${emoji.three} Se confirma disponibilidad de materiales
${emoji.four} Se realiza anticipo
${emoji.five} Se agenda entrega/env\u00EDo`,
  quoteInstructions: `
Perfecto ${emoji.hands}

Para enviarte tu cotizaci\u00F3n comp\u00E1rtenos en un solo mensaje:

\u2022 Nombre
\u2022 Modelo y color
\u2022 cantidad de piezas
\u2022 de donde nos escribes

Ejemplo:

"Laura Mendez,
cuadrada negro 50 piezas
cuadrada azul 10 piezas
Miguel Hidalgo Cdmx"
`,
  invalidQuote: `Tu solicitud necesita algunos detalles adicionales ${emoji.smile}.
      En breve te ayudaremos a completar tu cotizaci\u00F3n..`,
  quoteSuccess: `\u00A1Perfecto! ${emoji.hands}

    Tu solicitud de cotizaci\u00F3n ya fue recibida.
    En breve nos pondremos en contacto contigo.`,
  openQuestion: `\u00A1Gracias! ${emoji.smile}

Revisaremos tu mensaje y te responderemos en breve.`,
};

type FlowStepOverrides = Partial<Record<ConversationState, FlowStepConfig>>;

interface CurrentFlowConfigOptions {
  initialState?: ConversationState;
  fallbackState?: ConversationState;
  steps?: FlowStepOverrides;
}

export function createCurrentFlowConfig(
  options: CurrentFlowConfigOptions = {},
): FlowConfig {
  const personalizedAttention = {
    reply: currentFlowMessages.personalizedAttentionReply,
    nextState: ConversationState.WAITING_HUMAN,
  };

  const mainMenuResponse = {
    reply: currentFlowMessages.mainMenu,
    nextState: ConversationState.MENU,
  };

  const postInfoStep = (state: ConversationState): FlowStepConfig => ({
    state,
    type: 'menu',
    options: {
      '1': {
        reply: currentFlowMessages.howToBuy,
        additionalReplies: [currentFlowMessages.postInfoMenu],
        nextState: ConversationState.SHOW_HOW_TO_BUY,
      },
      '2': {
        reply: currentFlowMessages.quoteInstructions,
        nextState: ConversationState.CAPTURE_QUOTE_DATA,
      },
      '3': mainMenuResponse,
    },
    fallback: personalizedAttention,
  });

  const steps: FlowConfig['steps'] = {
    [ConversationState.MENU]: {
      state: ConversationState.MENU,
      type: 'menu',
      options: {
        '1': {
          reply: currentFlowMessages.models,
          additionalReplies: [currentFlowMessages.postInfoMenu],
          nextState: ConversationState.SHOW_MODELS,
        },
        '2': {
          reply: currentFlowMessages.dynamics,
          additionalReplies: [currentFlowMessages.postInfoMenu],
          nextState: ConversationState.SHOW_DYNAMICS,
        },
        '3': {
          reply: currentFlowMessages.delivery,
          additionalReplies: [currentFlowMessages.postInfoMenu],
          nextState: ConversationState.SHOW_DELIVERY,
        },
        '4': {
          reply: currentFlowMessages.location,
          additionalReplies: [currentFlowMessages.postInfoMenu],
          nextState: ConversationState.SHOW_LOCATION,
        },
      },
      initialFallback: mainMenuResponse,
      fallback: personalizedAttention,
    },
    [ConversationState.SHOW_MODELS]: postInfoStep(
      ConversationState.SHOW_MODELS,
    ),
    [ConversationState.SHOW_DYNAMICS]: postInfoStep(
      ConversationState.SHOW_DYNAMICS,
    ),
    [ConversationState.SHOW_DELIVERY]: postInfoStep(
      ConversationState.SHOW_DELIVERY,
    ),
    [ConversationState.SHOW_LOCATION]: postInfoStep(
      ConversationState.SHOW_LOCATION,
    ),
    [ConversationState.SHOW_HOW_TO_BUY]: postInfoStep(
      ConversationState.SHOW_HOW_TO_BUY,
    ),
    [ConversationState.POST_INFO_MENU]: postInfoStep(
      ConversationState.POST_INFO_MENU,
    ),
    [ConversationState.CAPTURE_QUOTE_DATA]: {
      state: ConversationState.CAPTURE_QUOTE_DATA,
      type: 'capture_quote_data',
      invalidQuoteResponse: {
        reply: currentFlowMessages.invalidQuote,
        nextState: ConversationState.HUMAN_HANDOFF,
      },
      successResponse: {
        reply: currentFlowMessages.quoteSuccess,
        nextState: ConversationState.WAITING_HUMAN,
      },
    },
    [ConversationState.OPEN_QUESTION]: {
      state: ConversationState.OPEN_QUESTION,
      type: 'open_question',
      response: {
        reply: currentFlowMessages.openQuestion,
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
  };

  return {
    initialState: options.initialState ?? ConversationState.MENU,
    fallbackState: options.fallbackState ?? ConversationState.MENU,
    steps: {
      ...steps,
      ...options.steps,
    },
  };
}
