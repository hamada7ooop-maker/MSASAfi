import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ClassicDashboard } from './ClassicDashboard';
import { db as DB } from '@/core/db/core';
import { silentFail } from '@/core/utils';

const CalmDashboard = lazy(() =>
  import('./calm/CalmDashboard').then((m) => ({ default: m.CalmDashboard }))
);

const SETTING_KEY = 'calmDashboard';

/**
 * Dashboard entry point.
 *
 * Chooses between the classic dashboard and the "Calm Premium" prototype.
 * The preference is persisted in settings, and the calm variant is lazily
 * loaded so it costs nothing for users who never enable it.
 *
 * ClassicDashboard is intentionally left completely untouched, so switching
 * back is always a guaranteed-safe escape hatch.
 */
export function Dashboard() {
  const [calm, setCalm] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    DB.getSetting<boolean>(SETTING_KEY)
      .then((v) => { if (active) setCalm(v === true); })
      .catch(() => { if (active) setCalm(false); });
    return () => { active = false; };
  }, []);

  const exitCalm = useCallback(() => {
    setCalm(false);
    DB.setSetting(SETTING_KEY, false).catch(silentFail('[Dashboard] persist calm=false'));
  }, []);

  const enterCalm = useCallback(() => {
    setCalm(true);
    DB.setSetting(SETTING_KEY, true).catch(silentFail('[Dashboard] persist calm=true'));
  }, []);

  // Avoid flashing the classic dashboard before the preference resolves.
  if (calm === null) return null;

  if (calm) {
    return (
      <Suspense fallback={null}>
        <CalmDashboard onExit={exitCalm} />
      </Suspense>
    );
  }

  return (
    <>
      <ClassicDashboard />
      <CalmEntryButton onClick={enterCalm} />
    </>
  );
}

/**
 * Floating entry point into the prototype. Sits above the bottom nav.
 */
function CalmEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="تجربة الواجهة الجديدة"
      style={{
        position: 'fixed',
        insetInlineStart: '1rem',
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.55rem 0.9rem',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'linear-gradient(135deg,#0d1b33,#12395c)',
        color: '#fff',
        fontSize: '0.72rem',
        fontWeight: 700,
        boxShadow: '0 10px 26px -10px rgba(0,0,0,0.6)',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
        auto_awesome
      </span>
      واجهة جديدة
    </button>
  );
}
