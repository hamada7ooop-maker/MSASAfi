import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { NavigationDrawer } from './NavigationDrawer';
import { QuickAddModal } from '../modals/QuickAddModal';
import { RewardModal } from '../modals/RewardModal';
import { GlobalActionModal } from '../modals/GlobalActionModal';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { PinScreen } from '../../features/auth/components/PinScreen';
import { PostRestorePinGate } from '../../features/auth/components/PostRestorePinGate';
import { ReportBuilderModal } from '../../features/reports/components/ReportBuilderModal';
import { SearchOverlay } from '../modals/SearchOverlay';
import { NotifPanel } from '../../features/notifications/components/NotifPanel';
import { useAppStore } from '../../store/appStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef } from 'react';
import { applyDirection } from '../../i18n/engine';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell - The layout wrapper for all React pages.
 */
export function AppShell({ children }: AppShellProps) {
  const { isMenuOpen, setMenuOpen, isLocked } = useAppStore(
    useShallow((s) => ({
      isMenuOpen: s.isMenuOpen,
      setMenuOpen: s.setMenuOpen,
      isLocked: s.isLocked
    }))
  );
  const language = useSettingsStore((s) => s.language);
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);
  const mainRef = useRef<HTMLElement>(null);

  const { pullDistance, isRefreshing, threshold } = usePullToRefresh(mainRef, () => {
    // Trigger a full reload or data refresh
    window.location.reload();
  });

  useEffect(() => {
    applyDirection();
  }, [language]);

  // OnboardingFlow is now rendered as a fixed inset-0 z-[9999] overlay,
  // so we no longer need to forcefully lock the body overflow during onboarding.
  // This prevents any layout side-effects from interfering with the rest of the app.

  return (
    <div className="flex flex-col h-screen h-[100dvh] overflow-hidden bg-background">
      {/* Pull to Refresh Indicator */}
      <div 
        className={`ptr-indicator ${pullDistance > 10 || isRefreshing ? 'active' : ''}`}
        style={{ 
          transform: `translateX(-50%) translateY(${pullDistance}px) rotate(${pullDistance * 2}deg)`,
          opacity: Math.min(pullDistance / threshold, 1)
        }}
      >
        <span className={`material-symbols-outlined text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
          {isRefreshing ? 'sync' : 'expand_more'}
        </span>
      </div>

      {hasOnboarded && <Header />}
      {hasOnboarded && <NavigationDrawer isOpen={isMenuOpen} onClose={() => setMenuOpen(false)} />}
      
      <main
        ref={mainRef}
        id="main-content"
        className={`w-full max-w-full min-w-0 flex-1 overflow-x-hidden bg-background ${
          hasOnboarded ? 'safe-bottom overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div className={`w-full max-w-4xl max-w-full min-w-0 mx-auto min-h-full ${
          hasOnboarded ? 'pb-24' : ''
        }`}>
          {children}
        </div>
      </main>

      {hasOnboarded && <BottomNav />}
      <QuickAddModal />
      <GlobalActionModal />
      <RewardModal />
      <ReportBuilderModal />
      {hasOnboarded && <FloatingActionButton />}
      <SearchOverlay />
      <NotifPanel />
      {isLocked && <PinScreen />}
      {/* Sits above everything, including the lock screen: a restored vault has
          no PIN yet, so there is nothing for PinScreen to unlock -- but the
          restored data is lying in plaintext until this is answered. */}
      <PostRestorePinGate />
    </div>
  );
}
