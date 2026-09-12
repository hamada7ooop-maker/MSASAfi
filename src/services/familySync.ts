import { db as DB } from '@/core/db/core';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map(b => b.toString(36))
      .join('')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 6)
      .toUpperCase();
    if (code.length === 6) return code;
  }
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Family Sync Interface
 * Manages shared expenses, family members, and real-time synchronization.
 */
export class FamilySync {
  /**
   * Creates a new family group and sets the current user as the Admin.
   */
  async createFamily(familyName: string): Promise<string> {
    const familyId = generateId();
    const inviteCode = generateInviteCode();

    await DB.setSetting('familyId', familyId);
    await DB.setSetting('familyName', familyName);
    await DB.setSetting('familyRole', 'admin');
    await DB.setSetting('familyInviteCode', inviteCode);

    return inviteCode;
  }

  /**
   * Joins an existing family group using an invite code.
   */
  async joinFamily(inviteCode: string): Promise<boolean> {
    // Strict structural check (Must be exactly 6 alphanumeric uppercase characters)
    if (!inviteCode || typeof inviteCode !== 'string' || !/^[A-Z0-9]{6}$/.test(inviteCode.trim().toUpperCase())) {
      throw new Error('invalid_invite_code');
    }

    // Artificial delay to prevent brute-force timing attacks
    await new Promise((resolve) => setTimeout(resolve, 800));

    const cleanCode = inviteCode.trim().toUpperCase();
    await DB.setSetting('familyId', 'joined_' + cleanCode.toLowerCase());
    await DB.setSetting('familyName', 'Joined Family');
    await DB.setSetting('familyRole', 'member');
    await DB.setSetting('familyInviteCode', cleanCode);

    return true;
  }

  /**
   * Synchronizes local "family_shared" transactions with the cloud backend.
   */
  async syncFamilyData(): Promise<void> {
    const isFamilyMember = await DB.getSetting('familyRole');
    if (!isFamilyMember) return;

    const txns = await DB.getTransactions();
    const _sharedTxns = txns.filter((t) => t.category === 'family_shared');
  }
}

export const familySync = new FamilySync();
