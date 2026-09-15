import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NumberText } from '../../src/components/ui/NumberText';

/**
 * Directive 19 — Batch 0: the financial figure primitive.
 *
 * The contract pinned here is what every balance, amount, and counter in the
 * app will rely on: fixed-width figures, one family, no NaN ever reaching a
 * user's balance sheet.
 */
describe('NumberText — the financial figure primitive', () => {
  it('renders the value through the default locale-aware formatter', () => {
    render(<NumberText value={1234.5} data-testid="fig" />);
    // Grouping separator is locale-dependent; assert the digits and one separator.
    expect(screen.getByTestId('fig').textContent).toMatch(/^1[.,\u2009\u00a0 ]234[.,]5$/);
  });

  it('honors a custom formatter (currency-aware call sites pass their own)', () => {
    render(
      <NumberText
        value={98765.432}
        format={(v) => `${v.toFixed(0)} ر.س`}
        data-testid="fig"
      />
    );
    expect(screen.getByTestId('fig')).toHaveTextContent('98765 ر.س');
  });

  it('enforces the num-fin class (tabular-nums) and merges custom classes', () => {
    render(<NumberText value={1} format={(v) => String(v)} className="text-2xl font-extrabold" data-testid="fig" />);
    const el = screen.getByTestId('fig');
    expect(el.className).toContain('num-fin');
    expect(el.className).toContain('text-2xl');
    expect(el.className).toContain('font-extrabold');
  });

  it('defaults the accessible title to the formatted figure', () => {
    render(<NumberText value={42} format={(v) => String(v)} data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveAttribute('title', '42');
  });

  it('renders an em dash — never "NaN"/"∞" — for non-finite values', () => {
    const { rerender } = render(<NumberText value={NaN} data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveTextContent('—');
    rerender(<NumberText value={Infinity} data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveTextContent('—');
    rerender(<NumberText value={-Infinity} data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveTextContent('—');
  });

  it('keeps zero and negatives honest (no sign or zero mangling)', () => {
    render(<NumberText value={-4500.25} format={(v) => v.toFixed(2)} data-testid="fig" />);
    expect(screen.getByTestId('fig')).toHaveTextContent('-4500.25');
  });
});
