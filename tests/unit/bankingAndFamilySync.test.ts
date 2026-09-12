import { describe, it, expect, beforeEach } from 'vitest';
import { openBanking } from '../../src/services/openBanking';
import { FamilySync } from '../../src/services/familySync';
import { db as DB } from '@/core/db/core';

describe('OpenBanking & FamilySync Services Unit Tests', () => {
  beforeEach(async () => {
    await DB.settings.clear();
    await DB.transactions.clear();
  });

  describe('OpenBankingService (openBanking.ts)', () => {
    it('initializes supported countries and bank providers list', () => {
      expect(openBanking.countries.length).toBeGreaterThan(10);
      expect(openBanking.providers.length).toBeGreaterThan(15);
      
      const saudiProviders = openBanking.getProvidersByCountry('saudi');
      expect(saudiProviders.length).toBeGreaterThan(0);
      expect(saudiProviders.some(p => p.id === 'rajhi')).toBe(true);
    });

    it('connects a bank provider in simulated mode and saves connection', async () => {
      const connectResult = await openBanking.connectBank('rajhi');
      expect(connectResult).toBe(true);

      const connected = await openBanking.getConnectedBanks();
      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('rajhi');
      expect(connected[0].isDemo).toBe(true);
      expect(connected[0].status).toBe('active');
    });

    it('prevents duplicate entries when connecting same provider twice', async () => {
      await openBanking.connectBank('rajhi');
      await openBanking.connectBank('rajhi');

      const connected = await openBanking.getConnectedBanks();
      expect(connected.length).toBe(1);
    });

    it('throws error when connecting an unsupported bank provider', async () => {
      await expect(openBanking.connectBank('non_existent_bank')).rejects.toThrow('Unsupported Provider');
    });

    it('disconnects a bank provider properly', async () => {
      await openBanking.connectBank('rajhi');
      await openBanking.connectBank('snb');

      let connected = await openBanking.getConnectedBanks();
      expect(connected.length).toBe(2);

      await openBanking.disconnectBank('rajhi');
      connected = await openBanking.getConnectedBanks();
      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('snb');
    });
  });

  describe('FamilySync Service (familySync.ts)', () => {
    const familySync = new FamilySync();

    it('creates family group with admin role and valid 6-char invite code', async () => {
      const inviteCode = await familySync.createFamily('Al-Mansoor Family');
      expect(inviteCode).toBeDefined();
      expect(inviteCode.length).toBe(6);

      const savedName = await DB.getSetting('familyName');
      const savedRole = await DB.getSetting('familyRole');
      const savedCode = await DB.getSetting('familyInviteCode');

      expect(savedName).toBe('Al-Mansoor Family');
      expect(savedRole).toBe('admin');
      expect(savedCode).toBe(inviteCode);
    });

    it('joins family group with valid 6-character code', async () => {
      const joined = await familySync.joinFamily('ABC123');
      expect(joined).toBe(true);

      const savedRole = await DB.getSetting('familyRole');
      const savedCode = await DB.getSetting('familyInviteCode');

      expect(savedRole).toBe('member');
      expect(savedCode).toBe('ABC123');
    });

    it('rejects invalid invite codes with invalid_invite_code error', async () => {
      await expect(familySync.joinFamily('12')).rejects.toThrow('invalid_invite_code');
      await expect(familySync.joinFamily('TOOLONG12345')).rejects.toThrow('invalid_invite_code');
      await expect(familySync.joinFamily('')).rejects.toThrow('invalid_invite_code');
    });

    it('syncFamilyData runs smoothly without throwing errors', async () => {
      // Non-member should exit early
      await familySync.syncFamilyData();

      // Set member and test shared sync
      await DB.setSetting('familyRole', 'member');
      await DB.transactions.add({
        id: 'tx_fam_1',
        amount: 300,
        type: 'expense',
        category: 'family_shared',
        date: '2026-08-30',
        createdAt: '2026-08-30T10:00:00Z',
        accountId: 'acc1'
      });

      await expect(familySync.syncFamilyData()).resolves.not.toThrow();
    });
  });
});
