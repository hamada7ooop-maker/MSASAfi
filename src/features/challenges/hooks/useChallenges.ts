import { useLiveQuery } from 'dexie-react-hooks';
import { db, db as DB } from '@/core/db/core';
import type { Challenge } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';

export function useChallenges() {
  const { t } = useI18n();

  const challenges = useLiveQuery(
    () => db.challenges.toArray(),
    [],
    [] as Challenge[]
  );

  const isLoading = challenges === undefined;

  const addChallenge = async (data: Partial<Challenge>) => {
    await (DB.addChallenge as (d: unknown) => Promise<string>)(data);
    toast(t('action.saved') || 'Saved successfully', 'success');
  };

  const updateChallenge = async (id: string, data: Partial<Challenge>) => {
    await DB.updateChallenge(id, data);
  };

  const deleteChallenge = async (id: string) => {
    try {
      await DB.deleteChallenge(id);
      toast(t('action.deleted') || 'Deleted', 'success');
    } catch (err) {
      silentFail('[useChallenges] delete error')(err);
      toast(t('common.error'), 'error');
    }
  };

  return {
    challenges: challenges || [],
    isLoading,
    addChallenge,
    updateChallenge,
    deleteChallenge,
    refresh: () => {}, // No longer needed with live query but keeping for compatibility
  };
}
