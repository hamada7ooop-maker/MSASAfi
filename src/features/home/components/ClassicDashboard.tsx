import React from 'react';
import { useHomeData } from '../hooks/useHomeData';
import { ErrorState } from '../../../components/common/ErrorState';
import { CardSkeleton } from '../../../components/ui/Skeleton';
import { WidgetErrorBoundary } from '../../../components/common/WidgetErrorBoundary';
import { GamificationWidget } from './GamificationWidget';
import { DashboardSection } from './dashboard/sections';
import { EditableSection } from './dashboard/EditableSection';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { getRandomTip } from '../../../core/categoryUtils';
import { APP_VERSION } from '../../../core/constants';

/**
 * Classic Dashboard — the main landing page (Directive 19 Batch 1 rebuild).
 *
 * Composition root only: data hooks, homeOrder orchestration, and the
 * twin-card pairing. Everything visual lives in single-responsibility
 * pieces under ./dashboard/ (sections.tsx routes by id). Every behavior is
 * pinned by the characterization suite in tests/unit/classicDashboard.test.tsx.
 */
export function ClassicDashboard() {
  const data = useHomeData();
  const { isLoading, error, retry } = data;

  const { t } = useI18n();
  const { setGlobalActionOpen, isHomeEditing, setHomeEditing } = useAppStore(
    useShallow((s) => ({
      setGlobalActionOpen: s.setGlobalActionOpen,
      isHomeEditing: s.isHomeEditing,
      setHomeEditing: s.setHomeEditing
    }))
  );
  const { homeOrder, setHomeOrder, isSimpleMode } = useSettingsStore(
    useShallow((s) => ({
      homeOrder: s.homeOrder,
      setHomeOrder: s.setHomeOrder,
      isSimpleMode: s.isSimpleMode
    }))
  );
  const dailyTip = React.useMemo(() => getRandomTip(), []);

  const filteredHomeOrder = React.useMemo(() => {
    if (!isSimpleMode) return homeOrder;
    // Basic essential blocks for a streamlined experience
    const simpleBlocks = ['banner', 'balance', 'incomeExpense', 'recent', 'quickAccess', 'alerts'];
    return homeOrder.filter((item) => simpleBlocks.includes(item.id));
  }, [homeOrder, isSimpleMode]);

  const moveItem = React.useCallback((index: number, direction: 'up' | 'down') => {
    const currentHomeOrder = useSettingsStore.getState().homeOrder;
    const newOrder = [...currentHomeOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setHomeOrder(newOrder);
  }, [setHomeOrder]);

  const toggleVisibility = React.useCallback((index: number) => {
    const currentHomeOrder = useSettingsStore.getState().homeOrder;
    const newOrder = [...currentHomeOrder];
    newOrder[index] = { ...newOrder[index], visible: !newOrder[index].visible };
    setHomeOrder(newOrder);
  }, [setHomeOrder]);

  // Directive 17 item 3: isLoading now genuinely means "first result not in
  // yet" — but an early failure must still win over skeletons (Directive 16:
  // a failed load shows ErrorState, not an eternal skeleton).
  if (isLoading && !error) {
    return (
      <div className="p-4 space-y-6">
        <div className="h-40 bg-gradient-to-br from-blue-600/20 to-blue-400/10 rounded-[2rem] animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // Directive 16: a failed live query used to throw straight through this
  // component into an ErrorBoundary, killing every widget on the board.
  if (error) return <ErrorState onRetry={retry} />;

  const showRankCard = (id: 'financialScore' | 'gamification') =>
    id === 'gamification' &&
    filteredHomeOrder.some((s) => s.id === 'financialScore' && s.visible);

  return (
    <div className="animate-in fade-in duration-700 pb-32 space-y-6">
      {/* Customization Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="space-y-1">
          <h1 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('nav.home')}
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('home.welcome') || 'Welcome back!'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setHomeEditing(!isHomeEditing)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isHomeEditing ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-surface-container-low text-slate-500 hover:bg-surface-container-high'}`}
          title={isHomeEditing ? t('action.done') : t('action.customize')}
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {isHomeEditing ? 'check' : 'dashboard_customize'}
          </span>
        </button>
      </div>

      <div className="space-y-6">
        {filteredHomeOrder.map((section, index) => {
          if (!section.visible && !isHomeEditing) return null;

          // In non-edit mode: if financialScore and gamification are adjacent
          // & visible, pair them into the twin 2-column grid.
          if (!isHomeEditing) {
            if (section.id === 'financialScore') {
              const nextSection = filteredHomeOrder[index + 1];
              if (nextSection && nextSection.id === 'gamification' && nextSection.visible) {
                return (
                  <div key="financialScore-gamification-pair" className="relative group transition-all">
                    <WidgetErrorBoundary widgetName="مؤشر الصحة والتصنيف المالي">
                      <GamificationWidget />
                    </WidgetErrorBoundary>
                  </div>
                );
              }
            } else if (section.id === 'gamification') {
              const prevSection = filteredHomeOrder[index - 1];
              if (prevSection && prevSection.id === 'financialScore' && prevSection.visible) {
                // Already rendered paired above with financialScore
                return null;
              }
            }
          }

          return (
            <EditableSection
              key={section.id}
              label={t(section.labelKey) || section.id}
              visible={section.visible}
              isEditing={isHomeEditing}
              canMoveUp={index !== 0}
              canMoveDown={index !== homeOrder.length - 1}
              onMoveUp={() => moveItem(index, 'up')}
              onMoveDown={() => moveItem(index, 'down')}
              onToggleVisibility={() => toggleVisibility(index)}
            >
              <DashboardSection
                id={section.id}
                deps={{
                  data,
                  dailyTip: dailyTip.text,
                  onOpenActionSheet: () => setGlobalActionOpen(true),
                  showRankCard: showRankCard('gamification'),
                }}
              />
            </EditableSection>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="py-10 text-center opacity-30 select-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
          MASARIFI INTELLIGENCE ENGINE V{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
