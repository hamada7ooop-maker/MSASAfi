import { useState, useCallback } from 'react';

/**
 * Hook to manage multi-selection state across lists.
 */
export function useSelection<T = string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggleSelection = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    isSelecting: selectedIds.size > 0,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected
  };
}
