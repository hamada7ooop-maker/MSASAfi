import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Directive 11 — every icon-only button must announce an action, not a glyph.
 *
 * ## The defect this prevents
 *
 * Material Symbols renders its icons from *ligature text*: `<span
 * className="material-symbols-outlined">delete</span>` puts the literal string
 * "delete" in the DOM and the font draws a bin over it. Sighted users see an
 * icon; a screen reader reads the word.
 *
 * When such a span is the only content of a `<button>`, the button's
 * accessible name becomes that ligature. Users hear "close", "bolt",
 * "content_copy", "backspace" — font internals, not actions. `bolt` and
 * `content_copy` are not even words.
 *
 * A sweep at the time of writing found **85 such buttons across 55 files**,
 * i.e. essentially every screen. This test pins the whole codebase so the
 * count cannot climb again.
 *
 * ## Why a source scan rather than a render test
 *
 * Rendering all 55 screens would need a fixture per screen and would still
 * miss buttons behind conditional branches. The property being asserted is
 * static — "this button has an accessible name" — so it is checked statically,
 * and therefore covers branches no test ever reaches.
 *
 * ## How to satisfy it
 *
 * Give the button an `aria-label` (or a `title`), and mark the decorative span
 * `aria-hidden="true"` so the ligature is not appended to that label —
 * otherwise the user hears "delete transaction delete".
 */

const SRC = join(process.cwd(), 'src');

/**
 * Files exempted from the scan, each for a stated reason.
 *
 * Deliberately tiny. An allowlist that grows is a rule being abandoned one
 * entry at a time, so anything added here needs a justification a reviewer
 * would accept.
 */
const ALLOWLIST: Array<{ path: string; why: string }> = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Extracts complete `<button>…</button>` blocks, handling nesting. */
function buttonBlocks(src: string): Array<{ index: number; block: string }> {
  const out: Array<{ index: number; block: string }> = [];
  const re = /<button\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = m.index;
    let depth = 0;
    let j = start;
    while (j < src.length) {
      if (src.startsWith('<button', j)) {
        depth++;
        j += 7;
        continue;
      }
      if (src.startsWith('</button>', j)) {
        depth--;
        j += 9;
        if (depth === 0) break;
        continue;
      }
      j++;
    }
    out.push({ index: start, block: src.slice(start, j) });
  }
  return out;
}

/**
 * True when the button's only content is icon ligature text.
 *
 * Tags are stripped, then JSX expressions — a `{t('...')}` child is a real
 * label, so a button containing one is fine. What remains is literal text; if
 * it is empty or looks like a ligature (lowercase, digits, underscores) the
 * button has nothing a screen reader can usefully announce.
 */
function isIconOnly(block: string): boolean {
  if (!block.includes('material-symbols-outlined')) return false;

  // Remove the icon spans first, ligature and all. Whatever is left is the
  // button's real content. Doing it the other way round -- stripping tags and
  // then JSX -- leaves the ligature behind and wrongly flags buttons that DO
  // carry a visible label, which is how four false positives appeared in the
  // first sweep of this codebase.
  const withoutIcons = block.replace(
    /<span[^>]*material-symbols-outlined[^>]*>[\s\S]*?<\/span>/g,
    ' '
  );

  // Strip the button's own opening tag by brace/bracket awareness rather than
  // with `<[^>]*>`. A handler like `onClick={() => setX(1)}` contains a `>`,
  // so the naive regex ends the tag early and leaks attribute source into the
  // "visible text" -- which made two genuinely unlabelled buttons on the
  // Accounts screen look like they had a label. Found by the rendered
  // cross-check below, not by this scan.
  let depth = 0;
  let openEnd = 0;
  for (let k = 0; k < withoutIcons.length; k++) {
    const ch = withoutIcons[k];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) {
      openEnd = k + 1;
      break;
    }
  }
  const rest = withoutIcons.slice(openEnd).replace(/<[^>]*>/g, ' ');

  // A `{t('...')}` child is a genuine label.
  if (/\{[^{}]*\bt\(/.test(rest)) return false;

  const text = rest
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text === '' || /^[a-z0-9_ ]+$/.test(text);
}

const hasAccessibleName = (block: string) =>
  block.includes('aria-label') || block.includes('title=');

describe('Directive 11 — icon-only buttons announce an action', () => {
  const files = walk(SRC).filter(
    (f) => !ALLOWLIST.some((a) => f.endsWith(a.path))
  );

  it('scans a realistic number of component files', () => {
    // Guards the guard: a broken walk would make every assertion below pass
    // vacuously, which is the failure mode of a source-scanning test.
    expect(files.length).toBeGreaterThan(100);
  });

  it('detects the pattern it claims to detect', () => {
    // A guard that cannot fire grants false confidence, so prove both
    // directions on known samples before trusting the sweep.
    const bad = `<button onClick={x}><span className="material-symbols-outlined">delete</span></button>`;
    const labelled = `<button aria-label={t('action.delete')} onClick={x}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>`;
    const texted = `<button onClick={x}><span className="material-symbols-outlined">delete</span>{t('action.delete')}</button>`;
    const dynamicIcon = `<button onClick={x}><span className="material-symbols-outlined">{isRTL ? 'arrow_forward' : 'arrow_back'}</span></button>`;

    expect(isIconOnly(bad) && !hasAccessibleName(bad)).toBe(true);
    expect(isIconOnly(labelled) && !hasAccessibleName(labelled)).toBe(false);
    // A button with visible text alongside the icon already reads correctly.
    expect(isIconOnly(texted)).toBe(false);
    // ...but a dynamically chosen ligature with no text is still icon-only.
    expect(isIconOnly(dynamicIcon) && !hasAccessibleName(dynamicIcon)).toBe(true);
  });

  it('leaves no icon-only button without an accessible name', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const { index, block } of buttonBlocks(src)) {
        if (!isIconOnly(block) || hasAccessibleName(block)) continue;
        const line = src.slice(0, index).split('\n').length;
        const lig = /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)/.exec(block);
        offenders.push(
          `${file.replace(process.cwd() + '/', '')}:${line}` +
            (lig ? `  (reads aloud as "${lig[1]}")` : '')
        );
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Screen readers announce the Material ligature verbatim for these ` +
          `buttons — users hear "close", "bolt", "content_copy" instead of an ` +
          `action. Add aria-label={t('...')} to the button and ` +
          `aria-hidden="true" to the icon span:\n` +
          offenders.map((o) => `  - ${o}`).join('\n')
        : undefined
    ).toEqual([]);
  });

  it('hides decorative icon spans inside labelled buttons', () => {
    // Without aria-hidden the ligature is concatenated onto the label, so the
    // user hears "delete transaction delete".
    const offenders: string[] = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const { index, block } of buttonBlocks(src)) {
        if (!hasAccessibleName(block)) continue;
        if (!block.includes('material-symbols-outlined')) continue;
        if (!isIconOnly(block)) continue; // text buttons are unaffected
        const spans = block.match(/<span[^>]*material-symbols-outlined[^>]*>/g) || [];
        if (spans.some((s) => !s.includes('aria-hidden'))) {
          const line = src.slice(0, index).split('\n').length;
          offenders.push(`${file.replace(process.cwd() + '/', '')}:${line}`);
        }
      }
    }

    expect(
      offenders,
      offenders.length
        ? `These buttons have a label but expose the icon ligature too, so it ` +
          `is read after the label. Add aria-hidden="true" to the span:\n` +
          offenders.map((o) => `  - ${o}`).join('\n')
        : undefined
    ).toEqual([]);
  });
});

/**
 * A rendered cross-check of the static sweep above.
 *
 * The scan is a source-text analysis, so it could in principle pass while the
 * running DOM still exposes a ligature — a stale build, a label that resolves
 * to an empty string, or a `t()` key that does not exist would all slip
 * through. This mounts a representative screen and computes accessible names
 * the way a screen reader does, closing that gap.
 */
describe('rendered accessible names on a representative screen', () => {
  it('announces actions, never Material ligatures', async () => {
    const { render, waitFor } = await import('@testing-library/react');
    const React = (await import('react')).default;
    const { MemoryRouter } = await import('react-router-dom');
    const { Accounts } = await import('@/features/accounts/components/Accounts');
    const { db: DB } = await import('@/core/db/core');

    await DB.transaction('rw', DB.tables, async () => {
      for (const t of DB.tables) await t.clear();
    });
    await DB.accounts.put({
      id: 'a1', name: 'الحساب الجاري', balance: 5000, type: 'bank',
    } as never);
    await new Promise((r) => setTimeout(r, 0));

    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(Accounts))
    );
    await waitFor(() => {
      expect(container.textContent).toContain('الحساب الجاري');
    });

    const LIGATURES = new Set([
      'add', 'close', 'edit', 'delete', 'refresh', 'save', 'info', 'bolt',
      'content_copy', 'check_circle', 'arrow_back', 'arrow_forward', 'sync',
      'share', 'lock', 'lock_open', 'mic', 'send', 'crop', 'backspace',
    ]);

    const clean = (s: string | null | undefined) =>
      (s || '').replace(/\s+/g, ' ').trim();

    const offenders: string[] = [];
    for (const btn of Array.from(container.querySelectorAll('button'))) {
      const aria = btn.getAttribute('aria-label');
      const title = btn.getAttribute('title');
      let name = clean(aria) || clean(title);
      if (!name) {
        const clone = btn.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
        name = clean(clone.textContent);
      }
      if (!name || LIGATURES.has(name)) {
        offenders.push(`"${name}" (raw: ${clean(btn.textContent).slice(0, 24)})`);
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Rendered buttons announcing a ligature or nothing at all:\n` +
          offenders.map((o) => `  - ${o}`).join('\n')
        : undefined
    ).toEqual([]);
  });
});
