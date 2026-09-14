import { describe, it, expect, vi } from 'vitest';
import { onActivate, activatable } from '@/core/a11yKeyboard';

/**
 * Unit tests for the keyboard-activation helper.
 *
 * This helper is applied at ~75 call sites, so a defect here is a defect
 * everywhere. Each behaviour is asserted separately rather than in one
 * combined case, so a regression names itself.
 */

const key = (k: string) => {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  return {
    event: { key: k, preventDefault, stopPropagation } as never,
    preventDefault,
    stopPropagation,
  };
};

describe('onActivate', () => {
  it('fires on Enter', () => {
    const action = vi.fn();
    const { event } = key('Enter');
    onActivate(action)(event);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('fires on Space', () => {
    const action = vi.fn();
    onActivate(action)(key(' ').event);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('fires on the legacy Spacebar key name', () => {
    // Older WebViews report ' ' as 'Spacebar'; Android WebView is the target
    // platform here, so the alias is not hypothetical.
    const action = vi.fn();
    onActivate(action)(key('Spacebar').event);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores every other key', () => {
    const action = vi.fn();
    for (const k of ['a', 'Tab', 'Escape', 'ArrowDown', 'Shift']) {
      onActivate(action)(key(k).event);
    }
    expect(action).not.toHaveBeenCalled();
  });

  it('prevents Space from scrolling the page', () => {
    const { event, preventDefault } = key(' ');
    onActivate(vi.fn())(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not preventDefault for keys it ignores', () => {
    // Swallowing Tab would trap focus -- the opposite of the goal.
    const { event, preventDefault } = key('Tab');
    onActivate(vi.fn())(event);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('stops the event reaching a clickable ancestor', () => {
    // Clickable rows nest inside clickable cards in this codebase; without
    // this, one keypress runs both handlers.
    const { event, stopPropagation } = key('Enter');
    onActivate(vi.fn())(event);
    expect(stopPropagation).toHaveBeenCalled();
  });
});

describe('activatable', () => {
  it('supplies all three required props together', () => {
    const props = activatable(vi.fn());
    // Half-applied fixes are the common failure: a role with no tab stop is
    // announced but unreachable.
    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
    expect(typeof props.onKeyDown).toBe('function');
    expect(typeof props.onClick).toBe('function');
  });

  it('honours a custom role and an accessible label', () => {
    const props = activatable(vi.fn(), { role: 'tab', label: 'الملخص' });
    expect(props.role).toBe('tab');
    expect((props as { 'aria-label'?: string })['aria-label']).toBe('الملخص');
  });

  it('omits aria-label when none is given, rather than emitting an empty one', () => {
    // An empty aria-label silences the element's own text, which is worse
    // than having no label at all.
    expect('aria-label' in activatable(vi.fn())).toBe(false);
  });

  it('routes both pointer and keyboard to the same action', () => {
    const action = vi.fn();
    const props = activatable(action);
    props.onClick();
    props.onKeyDown(key('Enter').event);
    expect(action).toHaveBeenCalledTimes(2);
  });
});
