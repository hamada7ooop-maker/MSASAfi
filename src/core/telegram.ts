import { secureSet, secureGet } from './secureStore';
import { silentFail } from './utils';

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

export async function saveTelegramCredentials(botToken: string, chatId: string): Promise<boolean> {
  try {
    const creds: TelegramCredentials = {
      botToken: botToken.trim(),
      chatId: chatId.trim()
    };
    const saved = await secureSet('telegram_secure_credentials', JSON.stringify(creds));
    return saved;
  } catch (error) {
    silentFail('[Telegram] Failed to save credentials securely')(error);
    return false;
  }
}

export async function getTelegramCredentials(): Promise<TelegramCredentials | null> {
  try {
    // 1. Try to load unified integrated credentials
    const rawJson = await secureGet('telegram_secure_credentials');
    if (rawJson) {
      try {
        const creds = JSON.parse(rawJson);
        if (creds && creds.botToken && creds.chatId) {
          return creds;
        }
      } catch (parseError) {
        silentFail('[Telegram] Failed to parse JSON credentials')(parseError);
      }
    }

    // 2. Fallback to legacy keys for backwards compatibility and migrate on the fly
    const legacyToken = await secureGet('telegram_bot_token');
    const legacyChatId = await secureGet('telegram_chat_id');
    if (legacyToken && legacyChatId) {
      const creds: TelegramCredentials = {
        botToken: legacyToken.trim(),
        chatId: legacyChatId.trim()
      };
      // Auto-migrate for future seamless requests
      await secureSet('telegram_secure_credentials', JSON.stringify(creds));
      return creds;
    }

    return null;
  } catch (error) {
    silentFail('[Telegram] Failed to retrieve credentials securely')(error);
    return null;
  }
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials();
    if (!credentials) return false;
    const { botToken, chatId } = credentials;
    return await executeSendMessage(botToken, chatId, message);
  } catch (error) {
    silentFail('[Telegram] Failed to send message')(error);
    return false;
  }
}

export async function testTelegramConnection(botToken: string, chatId: string): Promise<boolean> {
  const testMessage = `🔔 *مساعد مصاريفي المالي | Masarifi Assistant*\n\n✨ تم ربط تطبيق مصاريفي بنجاح مع حساب تليجرام الخاص بك!\n🚀 ستتلقى التنبيهات والتقارير المالية هنا بأمان تام.\n\n*Masarifi Professional Bot Connection Verified!*`;
  return await executeSendMessage(botToken, chatId, testMessage);
}

async function executeSendMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    silentFail('[Telegram] API fetch error (Silent fallback active)')(error);
    return false;
  }
}
