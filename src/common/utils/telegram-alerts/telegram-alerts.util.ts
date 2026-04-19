import axios from 'axios';

import { telegramAlertMessages } from './telegram-alert-messages';

type TelegramAlertContacts = {
  admin: string;
  agents: string[];
};

type TelegramAudience = 'system' | 'all';

const contacts =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./telegram-alert-contacts.json') as TelegramAlertContacts;

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim();
}

function getApiUrl() {
  const token = getTelegramBotToken();
  if (!token) {
    return null;
  }

  return `https://api.telegram.org/bot${token}/sendMessage`;
}

function getRecipients(audience: TelegramAudience) {
  if (audience === 'system') {
    return contacts.admin ? [contacts.admin] : [];
  }

  return contacts.agents.filter(Boolean);
}

function getErrorDetail(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.description ||
      error.response?.data?.error?.message ||
      error.message
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function sendTelegramAlert(
  audience: TelegramAudience,
  message: string,
) {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return;
  }

  const recipients = getRecipients(audience);
  if (!recipients.length) {
    return;
  }
  await Promise.allSettled(
    recipients.map(async (chatId) => {
      try {
        await axios.post(
          apiUrl,
          {
            chat_id: chatId,
            text: message,
          },
          {
            timeout: 10000,
          },
        );
      } catch (error) {
        console.error(`Error enviando a ${chatId}`, error.response?.data);
      }
    }),
  );
}

export async function notifyMetaSendFailure(
  action: 'sendText' | 'sendImage',
  to: string,
  error: unknown,
) {
  const detail = getErrorDetail(error);

  await sendTelegramAlert(
    'system',
    telegramAlertMessages.metaSendFailure(action, to, detail),
  );
}

export async function notifyOpenAiFailure(
  originalMessage: string,
  error: unknown,
) {
  const detail = getErrorDetail(error);

  await sendTelegramAlert(
    'system',
    telegramAlertMessages.openAiFailure(detail, originalMessage),
  );
}

export async function notifyWaitingHumanNewMessage(
  waId: string,
  conversationId: string,
  preview: string,
) {
  await sendTelegramAlert(
    'all',
    telegramAlertMessages.waitingHumanNewMessage(waId, conversationId, preview),
  );
}
