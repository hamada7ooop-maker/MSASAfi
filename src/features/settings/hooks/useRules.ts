import { useState, useEffect, useCallback } from 'react';
import { RuleRepository } from '../../../core/db/repositories/rules';
import { silentFail } from '../../../core/utils';
import type { ClassificationRule } from '@/types';

export function useRules() {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await RuleRepository.getAll();
      setRules(loaded);
    } catch (error) {
      silentFail('[useRules] Error fetching rules')(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (ruleData: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await RuleRepository.add(ruleData);
      const newRule: ClassificationRule = {
        ...ruleData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };
      setRules(prev => [newRule, ...prev]);
      return newRule;
    } catch (error) {
      silentFail('[useRules] Error adding rule')(error);
      throw error;
    }
  };

  const updateRule = async (id: string, data: Partial<ClassificationRule>) => {
    try {
      await RuleRepository.update(id, data);
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (error) {
      silentFail('[useRules] Error updating rule')(error);
      throw error;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await RuleRepository.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      silentFail('[useRules] Error deleting rule')(error);
      throw error;
    }
  };

  return {
    rules,
    isLoading,
    addRule,
    updateRule,
    deleteRule,
    refresh: fetchRules
  };
}
