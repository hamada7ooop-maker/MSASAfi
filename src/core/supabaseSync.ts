import { db as DB } from './db/core';
import { getCloudSession } from './cloud';
import { silentFail } from './utils';
import { recordException } from './crashlytics';
import type { Transaction } from '@/types';

interface CloudSession {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
  };
}

interface RemoteTransaction {
  id: string;
  user_id?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  updated_at?: string;
}

// Read from Vite environment variables — set in .env file
function getSecureProxyUrl(): string {
  const envUrl = import.meta.env.VITE_PROXY_URL;
  if (!envUrl) {
    // In production, NEVER use insecure HTTP fallback
    if (import.meta.env.PROD) {
      return '';
    }
    return 'http://localhost:3000/supabase';
  }

  // Force HTTPS in production to prevent man-in-the-middle data leakage
  if (import.meta.env.PROD && envUrl.startsWith('http://')) {
    recordException('[Security] Insecure proxy URL upgraded to HTTPS', new Error('HTTP proxy in production'));
    return envUrl.replace(/^http:\/\//i, 'https://');
  }

  return envUrl;
}

const PROXY_URL = getSecureProxyUrl();

/**
 * Implementation for syncing Masarifi data with Supabase via Backend Proxy.
 */
export class SupabaseSync {
  static isConfigured(): boolean {
    return !!(PROXY_URL && !PROXY_URL.includes('YOUR_') && (!import.meta.env.PROD || PROXY_URL.startsWith('https://')));
  }
  
  static getHeaders(session: CloudSession | null): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
    };
  }

  /**
   * Pushes local transactions to Supabase Cloud.
   */
  static async pushTransactions(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const session = (await getCloudSession()) as CloudSession | null;
      const userId = session?.user?.id;
      if (!userId) return false;

      const txns = await DB.getTransactions();
      if (!txns || txns.length === 0) return true;

      const payload = txns.map((tx: Transaction) => ({
        id: tx.id,
        user_id: userId,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        description: tx.description,
        date: tx.date || tx.createdAt,
        updated_at: new Date().toISOString()
      }));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${PROXY_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(session),
          'Prefer': 'resolution=merge-duplicates'
        },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Supabase push failed: ${res.statusText}`);
      return true;
    } catch (err: unknown) {
      silentFail('[Sync] Error pushing transactions')(err);
      return false;
    }
  }

  /**
   * Pulls remote transactions from Supabase Cloud and merges them locally.
   */
  static async pullTransactions(lastSyncDate?: string | null): Promise<number> {
    if (!this.isConfigured()) return 0;

    try {
      const session = (await getCloudSession()) as CloudSession | null;
      const userId = session?.user?.id;
      if (!userId) return 0;

      let url = `${PROXY_URL}/rest/v1/transactions?user_id=eq.${userId}&select=*`;
      if (lastSyncDate) {
        url += `&updated_at=gt.${lastSyncDate}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(session),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Supabase pull failed: ${res.statusText}`);
      
      const remoteTxns = (await res.json()) as RemoteTransaction[];
      
      for (const tx of remoteTxns) {
        const localTx: Transaction = {
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          description: tx.description,
          date: tx.date,
          createdAt: tx.date
        };
        await DB.saveTransaction(localTx);
      }
      
      return remoteTxns.length;
    } catch (err: unknown) {
      silentFail('[Sync] Error pulling transactions')(err);
      return 0;
    }
  }
}
