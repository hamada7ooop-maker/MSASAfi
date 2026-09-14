import React from 'react';
import { CARD_STYLES } from '../data/cardConstants';

export interface CardStylePickerProps {
  /** Currently selected style id, e.g. 'gold'. */
  styleName: string;
  onSelect: (styleId: string) => void;
  /** Local dictionary lookup owned by the parent sheet. */
  getTxt: (key: string) => string;
}

/**
 * Swatch grid for choosing the card's visual theme.
 *
 * Extracted from AddCardModal.tsx (632 lines) as part of L-1. Presentation
 * only: the selected id is owned by the parent's form state, so the preview
 * and the saved record cannot disagree about which style is active.
 */
export function CardStylePicker({ styleName, onSelect, getTxt }: CardStylePickerProps) {
  return (
<div>
  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }} className="text-slate-400">
    {getTxt('selectStyle')}
  </label>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
    {CARD_STYLES.map(style => (
      <button
        key={style.id}
        type="button"
        onClick={() => onSelect(style.id)}
        style={{
          padding: '0 8px',
          height: 44,
          borderRadius: 14,
          border: `2px solid ${styleName === style.id ? '#2563eb' : 'transparent'}`,
          cursor: 'pointer', transition: 'all 0.2s',
          position: 'relative', overflow: 'hidden',
          background: style.bg,
          boxShadow: styleName === style.id ? `0 4px 16px ${style.glowColor}` : 'none',
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 900, color: 'white',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          letterSpacing: '0.02em',
        }}>
          {getTxt(style.nameKey)}
        </span>
      </button>
    ))}
  </div>
</div>
  );
}
