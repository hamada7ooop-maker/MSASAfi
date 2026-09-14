import { db as DB } from '../db/core';
import { secureGet, secureSet, secureRemove } from '../secureStore';

export interface CustomAIConfig {
  url: string;
  key: string;
  model?: string;
}

/**
 * Credential storage and provider selection for the AI advisor.
 *
 * Extracted from core/gemini.ts (679 lines) as part of L-1. Kept as its own
 * module because it decides **which third party receives the user's financial
 * summary** -- a privacy boundary, not a formatting detail. Anything touching
 * that decision should be reviewable without reading the request plumbing.
 *
 * Keys live in `secureStore` (Capacitor Preferences, encrypted), never in the
 * Dexie settings table, so they are not swept into a local backup.
 */

export async function getActiveProviderName(): Promise<string> {
  const [gemini, groq, custom, freeAi] = await Promise.all([
    getGeminiKey(),
    getGroqKey(),
    DB.getSetting('customAiConfig'),
    hasPuterKey()
  ]);
  if (freeAi) return 'Free AI';
  if (gemini) return 'Gemini';
  if (groq) return 'Groq';
  if (custom) return 'Custom';
  return '';
}

// ─── Key Management ──────────────────────────────────────────────────────────

export async function getGeminiKey(): Promise<string | null> {
  return await secureGet('geminiApiKey');
}

export async function getGroqKey(): Promise<string | null> {
  return await secureGet('groqApiKey');
}

export async function saveGeminiKey(key: string, endpoint: string | null = null): Promise<boolean> {
  if (!key || key.trim().length < 4) return false;
  const saved = await secureSet('geminiApiKey', key.trim());
  if (saved && endpoint) await DB.setSetting('geminiApiEndpoint', endpoint.trim());
  return saved;
}

export async function saveGroqKey(key: string, endpoint: string | null = null): Promise<boolean> {
  if (!key || key.trim().length < 4) return false;
  const saved = await secureSet('groqApiKey', key.trim());
  if (saved && endpoint) await DB.setSetting('groqApiEndpoint', endpoint.trim());
  return saved;
}

export async function hasGeminiKey(): Promise<boolean> {
  const k = await getGeminiKey();
  return !!(k && k.length >= 4);
}

export async function hasGroqKey(): Promise<boolean> {
  const k = await getGroqKey();
  return !!(k && k.length >= 4);
}

export async function hasCustomKey(): Promise<boolean> {
  const c = (await DB.getSetting('customAiConfig')) as string | undefined;
  if (!c) return false;
  try {
    const p = JSON.parse(c) as CustomAIConfig;
    return !!(p.url && p.key);
  } catch (_) {
    return false;
  }
}

export async function hasPuterKey(): Promise<boolean> {
  return (await DB.getSetting('usePuter')) === true;
}

export async function savePuterKey(): Promise<boolean> {
  await DB.setSetting('usePuter', true);
  return true;
}

export async function hasAnyKey(): Promise<boolean> {
  const [g, gr, c, p] = await Promise.all([hasGeminiKey(), hasGroqKey(), hasCustomKey(), hasPuterKey()]);
  return !!(g || gr || c || p);
}

export async function removeGeminiKey(): Promise<void> {
  await secureRemove('geminiApiKey');
  await DB.setSetting('geminiApiEndpoint', null);
}

export async function removeGroqKey(): Promise<void> {
  await secureRemove('groqApiKey');
  await DB.setSetting('groqApiEndpoint', null);
}

export async function removeCustomKey(): Promise<void> {
  await secureRemove('customAiConfig');
}

export async function removePuterKey(): Promise<void> {
  await DB.setSetting('usePuter', false);
}

export async function getConnectedProviders(): Promise<string[]> {
  const [g, gr, c, p] = await Promise.all([hasGeminiKey(), hasGroqKey(), hasCustomKey(), hasPuterKey()]);
  const list: string[] = [];
  if (p) list.push('Free AI');
  if (g) list.push('Gemini');
  if (gr) list.push('Groq');
  if (c) list.push('Custom');
  return list;
}

// ─── Financial Context Builder ───────────────────────────────────────────────
