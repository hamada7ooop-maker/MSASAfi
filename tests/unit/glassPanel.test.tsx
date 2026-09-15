import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { GlassPanel } from '../../src/components/ui/GlassPanel';

/**
 * Directive 19 — Batch 0: the sanctioned glassmorphism surface.
 * Typed, ref-forwarding, class-merging; the visual recipe lives in
 * `.glass-panel` (index.css) and its blur budget is documented there.
 */
describe('GlassPanel — the floating-layer glass primitive', () => {
  it('renders children inside a glass-panel surface', () => {
    render(
      <GlassPanel data-testid="gp">
        <span>balance sheet</span>
      </GlassPanel>
    );
    const el = screen.getByTestId('gp');
    expect(el.className).toContain('glass-panel');
    expect(screen.getByText('balance sheet')).toBeInTheDocument();
  });

  it('adds the strong variant only when requested', () => {
    const { rerender } = render(<GlassPanel data-testid="gp" />);
    expect(screen.getByTestId('gp').className).not.toContain('glass-panel-strong');
    rerender(<GlassPanel strong data-testid="gp" />);
    expect(screen.getByTestId('gp').className).toContain('glass-panel-strong');
    // the base treatment stays on when strong is layered
    expect(screen.getByTestId('gp').className).toContain('glass-panel');
  });

  it('merges custom classes (radius/spacing come from the call site)', () => {
    render(<GlassPanel className="p-5 rounded-t-[var(--radius-sheet)]" data-testid="gp" />);
    expect(screen.getByTestId('gp').className).toContain('p-5');
    expect(screen.getByTestId('gp').className).toContain('rounded-t-[var(--radius-sheet)]');
  });

  it('forwards the ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<GlassPanel ref={ref} data-testid="gp" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByTestId('gp'));
  });

  it('passes through arbitrary div attributes', () => {
    render(<GlassPanel id="hero-card" role="region" aria-label="الرصيد" data-testid="gp" />);
    const el = screen.getByTestId('gp');
    expect(el).toHaveAttribute('id', 'hero-card');
    expect(el).toHaveAttribute('role', 'region');
    expect(el).toHaveAttribute('aria-label', 'الرصيد');
  });
});
