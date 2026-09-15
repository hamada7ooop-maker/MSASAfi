import React from 'react';
import { useCardText } from '../../hooks/useCardText';

/**
 * Directive 19 — Batch 3: the AES-GCM security footer, extracted verbatim
 * from the manager. The screen's trust signal — it stays exactly as it was.
 */
export function SecurityFooter() {
  const { getTxt } = useCardText();

  return (
    <div style={{ padding: '24px 20px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px', borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(0,43,89,0.06) 0%, rgba(29,78,216,0.04) 100%)',
        border: '1px solid rgba(29,78,216,0.1)',
      }} className="dark:bg-[#0f1b30]/60 dark:border-blue-900/30">
        <div style={{
          width: 36, height: 36, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #002b59, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>lock</span>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.6 }} className="text-blue-700 dark:text-blue-400">
          {getTxt('protectedNotice')}
        </p>
      </div>
    </div>
  );
}
