import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveTelegramCredentials,
  getTelegramCredentials,
  sendTelegramMessage,
  testTelegramConnection
} from '@/core/telegram';
import { secureSet, secureRemove } from '@/core/secureStore';

describe('Telegram Integration Unit Tests (telegram.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await secureRemove('telegram_secure_credentials');
    await secureRemove('telegram_bot_token');
    await secureRemove('telegram_chat_id');
  });

  it('saves and retrieves telegram credentials securely', async () => {
    const saved = await saveTelegramCredentials('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', '987654321');
    expect(saved).toBe(true);

    const creds = await getTelegramCredentials();
    expect(creds).toEqual({
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      chatId: '987654321'
    });
  });

  it('migrates legacy credentials if unified credentials do not exist', async () => {
    await secureSet('telegram_bot_token', 'legacy_token_abc');
    await secureSet('telegram_chat_id', 'legacy_chat_123');

    const creds = await getTelegramCredentials();
    expect(creds).toEqual({
      botToken: 'legacy_token_abc',
      chatId: 'legacy_chat_123'
    });
  });

  it('sends telegram message via mocked fetch', async () => {
    await saveTelegramCredentials('token123', 'chat456');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);

    const result = await sendTelegramMessage('Test alert message');
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken123/sendMessage',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns false when sending telegram message without credentials', async () => {
    await secureRemove('telegram_secure_credentials');
    const result = await sendTelegramMessage('No creds message');
    expect(result).toBe(false);
  });

  it('tests telegram connection', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    } as Response);

    const result = await testTelegramConnection('test_bot_token', 'test_chat_id');
    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
