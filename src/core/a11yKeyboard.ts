import type { KeyboardEvent } from 'react';

/**
 * Keyboard activation for elements that are clickable but are not `<button>`.
 *
 * ## Why this exists
 *
 * A `<div onClick={...}>` cannot be reached with Tab and does not respond to
 * Enter or Space. Anyone navigating without a pointer simply cannot use it.
 * The fix is always the same three things — a role, a tab stop, and a key
 * handler — so it lives here rather than being retyped at 75 call sites where
 * one of the three would eventually be forgotten.
 *
 * ## Why Enter *and* Space
 *
 * The native `<button>` contract responds to both, and users expect whichever
 * they are used to. Space is also prevented from scrolling the page, which is
 * its default action and would otherwise fire the control *and* jump the
 * viewport.
 *
 * ## When NOT to use this
 *
 * A modal backdrop that closes on click must stay out of the tab order: it is
 * an invisible full-screen layer, and Escape already provides the keyboard
 * route. Making it focusable is worse than leaving it pointer-only.
 *
 * Prefer a real `<button>` whenever the styling allows it — this helper is for
 * cases where an element must stay a `div` for layout reasons.
 */

/** Keys that activate a control, matching native `<button>` behaviour. */
const ACTIVATION_KEYS = ['Enter', ' ', 'Spacebar'];

/**
 * Builds an `onKeyDown` handler that fires `action` on Enter or Space.
 *
 * @example
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onClick={open}
 *   onKeyDown={onActivate(open)}
 * />
 */
export function onActivate<T extends Element>(
  action: (event?: KeyboardEvent<T>) => void
) {
  return (event: KeyboardEvent<T>): void => {
    if (!ACTIVATION_KEYS.includes(event.key)) return;
    // Space scrolls the page by default; Enter can submit an enclosing form.
    event.preventDefault();
    // Stop the event reaching a clickable ancestor, which would otherwise run
    // two handlers for one keypress -- a real hazard in this codebase, where
    // clickable rows frequently nest inside clickable cards.
    event.stopPropagation();
    action(event);
  };
}

/**
 * The full prop set for a keyboard-accessible non-button control.
 *
 * Spreading this makes it impossible to add the role but forget the tab stop,
 * which is the most common half-finished version of this fix.
 *
 * @example
 * <div {...activatable(open)} className="card">…</div>
 */
export function activatable<T extends Element>(
  action: (event?: KeyboardEvent<T>) => void,
  options: { role?: string; label?: string } = {}
) {
  return {
    role: options.role ?? 'button',
    tabIndex: 0,
    ...(options.label ? { 'aria-label': options.label } : {}),
    onClick: () => action(),
    onKeyDown: onActivate<T>(action),
  };
}
