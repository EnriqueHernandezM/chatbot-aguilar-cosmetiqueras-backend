import OpenAI from 'openai';

import { notifyOpenAiFailure } from './telegram-alerts/telegram-alerts.util';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export async function parseQuoteMessage(message: string) {
  const client = getOpenAIClient();
  if (!client) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `
          Extrae datos de cotizacion desde el mensaje.

          Devuelve SOLO JSON valido.

          Formato:

          {
          "name":string,
          "quantity":number,
          "product":string
          }

          Si falta informacion devuelve null en el campo.
          `,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    return JSON.parse(completion.choices[0].message.content || 'null');
  } catch (error) {
    await notifyOpenAiFailure(message, error);
    return null;
  }
}
