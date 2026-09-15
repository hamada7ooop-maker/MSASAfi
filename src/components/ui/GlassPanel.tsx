import React, { forwardRef } from 'react';

/**
 * Directive 19 — UI/UX Renaissance: GlassPanel (Batch 0: Enablement).
 *
 * The one sanctioned glassmorphism treatment for floating layers (sticky
 * bars, bottom sheets, badges over charts). The `.glass-panel` class carries
 * the visual recipe; this component exists so call sites get a typed surface
 * with ref forwarding and automatic class merging.
 *
 * Performance contract: blur is the most expensive compositing operation in
 * the WebView — at most THREE glass surfaces may be visible per screen.
 * `strong` raises opacity/blur for hero layers; it is not a license to stack.
 */
export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Denser glass for hero surfaces (balance card, primary sheet). */
  strong?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel({ strong = false, className = '', children, ...rest }, ref) {
    const classes = ['glass-panel'];
    if (strong) classes.push('glass-panel-strong');
    if (className) classes.push(className);
    return (
      <div ref={ref} className={classes.join(' ')} {...rest}>
        {children}
      </div>
    );
  }
);

export default GlassPanel;
