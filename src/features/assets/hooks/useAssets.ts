import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import { AssetRepository } from '../../../core/db/repositories/assets';
import type { Asset } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';

export function useAssets() {
  const { t } = useI18n();

  const assets = useLiveQuery(
    () => db.assets.toArray(),
    [],
    [] as Asset[]
  );

  const isLoading = assets === undefined;

  const addAsset = async (data: Omit<Asset, 'id'>) => {
    try {
      const item = await AssetRepository.add(data);
      toast(t('action.saved') || 'Saved successfully', 'success');
      return item;
    } catch (err) {
      silentFail('[useAssets] add error')(err);
      toast(t('common.error') || 'Error', 'error');
      throw err;
    }
  };

  const updateAsset = async (id: string, data: Partial<Asset>) => {
    try {
      await AssetRepository.update(id, data);
      toast(t('action.saved') || 'Saved successfully', 'success');
    } catch (err) {
      silentFail('[useAssets] update error')(err);
      toast(t('common.error') || 'Error', 'error');
      throw err;
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await AssetRepository.delete(id);
      toast(t('action.deleted') || 'Deleted', 'success');
    } catch (err) {
      silentFail('[useAssets] delete error')(err);
      toast(t('common.error') || 'Error', 'error');
      throw err;
    }
  };

  return {
    assets: assets || [],
    isLoading,
    addAsset,
    updateAsset,
    deleteAsset
  };
}
