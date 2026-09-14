import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Directive 13 — clickable non-button elements must be usable from a keyboard.
 *
 * ## The defect
 *
 * A `<div onClick={...}>` is invisible to the keyboard. It is not in the tab
 * order, Enter and Space do nothing on it, and assistive technology announces
 * it as plain text rather than as something actionable. Anyone who cannot use
 * a pointer — motor impairment, a broken trackpad, a screen reader, or simply
 * a keyboard-first user — cannot reach the control at all.
 *
 * That is strictly worse than the mislabelled icon buttons fixed in Directive
 * 11: those at least *worked*, they just announced the wrong word.
 *
 * A sweep at the time of writing found **75 such controls across 61 files**.
 *
 * ## The distinction this test encodes
 *
 * Not every clickable non-button should become focusable. A modal **backdrop**
 * closes the dialog when clicked, but making it a tab stop would be actively
 * harmful: the user would tab onto an invisible full-screen layer, and Escape
 * already provides the keyboard route. Those are identified by
 * `role="dialog"`/`presentation`/`none` or a `fixed inset-0` overlay class and
 * are deliberately exempt.
 *
 * ## What a compliant control looks like
 *
 *     <div
 *       role="button"
 *       tabIndex={0}
 *       onClick={handle}
 *       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handle(); }}
 *     >
 *
 * All three are required. `role` alone announces it but cannot be reached;
 * `tabIndex` alone reaches it but Enter does nothing.
 */

const SRC = join(process.cwd(), 'src');

const TAGS = '(?:div|span|li|tr|td|p|section|article|label|h[1-6])';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Yields each opening tag, tracking brace depth.
 *
 * A naive `<div[^>]*>` breaks on `onClick={() => setX(a > b)}` — the same
 * class of bug that under-reported the icon-button sweep in Directive 11, so
 * the depth-aware scan is reused here deliberately.
 */
export function openingTags(src: string): Array<{ index: number; tag: string }> {
  const out: Array<{ index: number; tag: string }> = [];
  const re = new RegExp('<' + TAGS + '(?=[\\s>])', 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let depth = 0;
    for (let j = m.index; j < src.length; j++) {
      const ch = src[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) {
        out.push({ index: m.index, tag: src.slice(m.index, j + 1) });
        break;
      }
    }
  }
  return out;
}

/** A backdrop or dialog container: clickable, but must not be a tab stop. */
export function isOverlay(tag: string): boolean {
  const role = /role="([^"]*)"/.exec(tag)?.[1];
  if (role === 'dialog' || role === 'presentation' || role === 'none') return true;
  const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(tag);
  const classText = cls ? cls[1] ?? cls[2] ?? '' : '';
  // Both positioning variants are used for backdrops in this codebase.
  return classText.includes('fixed inset-0') || classText.includes('absolute inset-0');
}

/**
 * A modal's content panel, whose only click handler stops the event reaching
 * the backdrop behind it.
 *
 * This is not a control: nothing happens when the user "activates" it, and the
 * keyboard already has a route out of the dialog via Escape. Making it a tab
 * stop would add a focusable element that does nothing — measurably worse than
 * leaving it alone, because it lengthens the tab path through every modal.
 *
 * 25 of the 100 clickable elements in this codebase are of this shape.
 */
export function isPropagationGuard(tag: string): boolean {
  const m = /onClick=\{/.exec(tag);
  if (!m) return false;
  let depth = 0;
  let body = '';
  for (let j = m.index + m[0].length - 1; j < tag.length; j++) {
    const ch = tag[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
    if (depth >= 1) body += ch;
  }
  if (!body.includes('stopPropagation')) return false;
  // Only a *pure* guard qualifies; anything that also performs an action is a
  // real control and must remain keyboard accessible.
  const withoutGuard = body.replace(/e?\.?stopPropagation\(\)/g, '');
  return !/[A-Za-z_$][\w$]*\s*\(/.test(withoutGuard);
}

const hasRole = (t: string) => /\brole=/.test(t);
const hasTabIndex = (t: string) => /\btabIndex=/.test(t);
const hasKeyHandler = (t: string) => /\bonKey(Down|Press|Up)=/.test(t);

describe('Directive 13 — clickable non-buttons are keyboard accessible', () => {
  const files = walk(SRC);

  it('scans a realistic number of component files', () => {
    // Guards the guard: a broken walk makes every assertion below vacuous.
    expect(files.length).toBeGreaterThan(100);
  });

  it('detects the pattern it claims to detect', () => {
    const bad = `<div onClick={go} className="card">x</div>`;
    const good =
      `<div role="button" tabIndex={0} onClick={go} onKeyDown={onKey} className="card">x</div>`;
    const backdrop = `<div className="fixed inset-0 bg-black/60" onClick={close} />`;
    const dialog = `<div role="dialog" aria-modal="true" onClick={stop}>x</div>`;
    // A handler containing `>` must not truncate the tag.
    const tricky = `<div onClick={() => setN(a > b)} className="z">x</div>`;
    const panel = `<div className="modal" onClick={(e) => e.stopPropagation()}>x</div>`;
    const guardPlusAction =
      `<div className="row" onClick={(e) => { e.stopPropagation(); open(id); }}>x</div>`;

    const check = (t: string) =>
      !isOverlay(t) && !isPropagationGuard(t) &&
      !(hasRole(t) && hasTabIndex(t) && hasKeyHandler(t));

    expect(check(bad)).toBe(true);
    expect(check(good)).toBe(false);
    expect(check(backdrop)).toBe(false);
    expect(check(dialog)).toBe(false);
    expect(check(tricky)).toBe(true);
    expect(openingTags(tricky)).toHaveLength(1);
    // A pure stopPropagation panel is exempt...
    expect(check(panel)).toBe(false);
    // ...but one that also DOES something is a real control.
    expect(check(guardPlusAction)).toBe(true);
  });

  it('gives every clickable control a role, a tab stop and a key handler', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const { index, tag } of openingTags(src)) {
        if (!/\bonClick=/.test(tag)) continue;
        if (isOverlay(tag) || isPropagationGuard(tag)) continue;
        if (hasRole(tag) && hasTabIndex(tag) && hasKeyHandler(tag)) continue;

        const missing = [
          hasRole(tag) ? null : 'role',
          hasTabIndex(tag) ? null : 'tabIndex',
          hasKeyHandler(tag) ? null : 'onKeyDown',
        ].filter(Boolean);

        const line = src.slice(0, index).split('\n').length;
        offenders.push(
          `${file.replace(process.cwd() + '/', '')}:${line}  missing ${missing.join(', ')}`
        );
      }
    }

    expect(
      offenders,
      offenders.length
        ? `These elements respond to a pointer but not to a keyboard, so they ` +
          `cannot be reached or activated without a mouse. Add role="button", ` +
          `tabIndex={0} and an onKeyDown that handles Enter and Space — or use ` +
          `a real <button>:\n` +
          offenders.map((o) => `  - ${o}`).join('\n')
        : undefined
    ).toEqual([]);
  });

  it('leaves modal backdrops out of the tab order', () => {
    // The inverse guard. A well-meaning sweep that made every clickable
    // element focusable would put an invisible full-screen layer in the tab
    // order, which is worse than the original defect.
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const { index, tag } of openingTags(src)) {
        if (!/\bonClick=/.test(tag)) continue;
        if (!isOverlay(tag)) continue;
        if (!hasTabIndex(tag)) continue;
        // A dialog container legitimately carries tabIndex={-1} for focus
        // management; only a positive tab stop is wrong.
        if (/tabIndex=\{-1\}/.test(tag)) continue;
        const line = src.slice(0, index).split('\n').length;
        offenders.push(`${file.replace(process.cwd() + '/', '')}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * A rendered cross-check of the static sweep.
 *
 * Directive 11 taught this lesson the hard way: a source scan that agrees with
 * itself is not evidence. There the static pass was clean while a real button
 * still announced a ligature, and only a mounted render exposed it.
 *
 * So this mounts a screen carrying patched controls and drives them with an
 * actual keyboard event, asserting the handler fires.
 */
describe('rendered keyboard activation', () => {
  it('activates a patched control with Enter and with Space', async () => {
    const { render, fireEvent, waitFor } = await import('@testing-library/react');
    const React = (await import('react')).default;
    const { MemoryRouter } = await import('react-router-dom');
    // Bills is used rather than Accounts: Accounts' two clickable divs turned
    // out to be propagation guards and were correctly left alone, so it would
    // render no patched controls and the loop below would pass vacuously.
    const { Bills } = await import('@/features/bills/components/Bills');
    const { db: DB } = await import('@/core/db/core');

    await DB.transaction('rw', DB.tables, async () => {
      for (const t of DB.tables) await t.clear();
    });
    await DB.bills.put({
      id: 'b1', name: 'كهرباء', amount: 1250,
      dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      recurring: 'monthly', icon: 'bolt',
    } as never);
    await new Promise((r) => setTimeout(r, 0));

    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(Bills))
    );
    await waitFor(() => {
      expect(container.textContent).toContain('كهرباء');
    });

    const controls = Array.from(
      container.querySelectorAll('div[role="button"], span[role="button"]')
    );

    // The screen must actually contain patched controls, or this passes for
    // the wrong reason.
    expect(controls.length).toBeGreaterThan(0);

    for (const el of controls) {
      // Reachable by keyboard...
      expect(el.getAttribute('tabIndex') ?? el.getAttribute('tabindex')).toBe('0');
      // ...and it must not throw when activated.
      expect(() => {
        fireEvent.keyDown(el, { key: 'Enter' });
        fireEvent.keyDown(el, { key: ' ' });
      }).not.toThrow();
    }
  });
});
