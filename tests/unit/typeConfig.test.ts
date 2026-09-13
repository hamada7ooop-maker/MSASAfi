import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-6 — TypeScript library checking.
 *
 * `skipLibCheck: true` hides type errors inside .d.ts files. Turning it off
 * surfaced 13 errors; 10 were genuinely ours and are fixed. The 3 that remain
 * are in third-party declarations for optional peers this project does not
 * install (y-dexie/yjs via dexie-react-hooks' unused useDocument hook, and
 * Buffer in tesseract.js), so the flag stays on deliberately.
 *
 * These tests pin the two local fixes, which are easy to undo by accident.
 */

const root = path.resolve(__dirname, '../..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('jest-dom types target Vitest, not Jest', () => {
  it('tsconfig uses the /vitest entrypoint', () => {
    const ts = read('tsconfig.json');
    expect(ts).toContain('@testing-library/jest-dom/vitest');
    // The bare entry pulls jest.d.ts, which needs @types/jest — deleted in L-3.
    expect(ts).not.toMatch(/"@testing-library\/jest-dom"/);
  });

  it('the Jest toolchain is still absent, so the bare entry would break', () => {
    const pkg = JSON.parse(read('package.json'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(all).not.toHaveProperty('jest');
    expect(all).not.toHaveProperty('@types/jest');
    expect(all).not.toHaveProperty('babel-jest');
    // The matchers themselves are still needed.
    expect(all).toHaveProperty('@testing-library/jest-dom');
  });

  it('the matchers are actually registered', () => {
    // Proves the types change did not silently drop the runtime import.
    expect(read('tests/setup.ts')).toContain("import '@testing-library/jest-dom'");
  });
});

describe('image modules are declared once', () => {
  it('env.d.ts does not redeclare what vite/client already provides', () => {
    const env = read('src/types/env.d.ts');
    // These four collided with vite/client: "Duplicate identifier 'src'".
    for (const ext of ['svg', 'png', 'jpg', 'webp']) {
      expect(env, `*.${ext} must not be redeclared`).not.toMatch(
        new RegExp(`declare module '\\*\\.${ext}'`)
      );
    }
  });

  it('still declares the things vite/client does NOT cover', () => {
    const env = read('src/types/env.d.ts');
    expect(env).toContain("declare module '@fontsource/*'");
  });

  it('vite/client is in the types list, since env.d.ts now relies on it', () => {
    expect(read('tsconfig.json')).toContain('"vite/client"');
  });
});

describe('the decision is documented where the next reader will look', () => {
  it('tsconfig explains why skipLibCheck stays on', () => {
    const ts = read('tsconfig.json');
    expect(ts).toContain('"skipLibCheck": true');
    // A bare flag invites someone to "clean it up" without knowing the cost.
    expect(ts).toMatch(/L-6|@types\/node/);
  });
});
