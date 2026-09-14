import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { APP_VERSION } from '../../src/core/constants';

/**
 * The user-visible version (About/Settings screens, onboarding, backups) must
 * always match the release version the owner signs (package.json). A drift
 * here shipped a v23.1.18 APK that displayed "V23.0.6" — this test makes that
 * class of silent mismatch impossible to merge again.
 */
describe('Version Alignment (constants.ts ↔ package.json)', () => {
  it('APP_VERSION matches the package.json release version', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
    ) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
  });
});
