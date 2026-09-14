import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { verifyCrashlyticsReadiness, EXPECTED_PACKAGE } from '../../scripts/verify-crashlytics-readiness.mjs';

/**
 * Directive 17 part 2 — the Crashlytics readiness gate
 * (scripts/verify-crashlytics-readiness.mjs).
 *
 * The owner's entire activation checklist is "drop google-services.json into
 * android/app/ and run the release". The most likely failure of that single
 * step is a wrong file — a mismatched package name, another Firebase project,
 * or malformed JSON — which would otherwise surface as an opaque Gradle error
 * minutes into assembleRelease. This gate must catch every such case in
 * milliseconds with a message that names the exact problem, and must NEVER
 * fail the legitimate states (no file = safely inert; valid file = green).
 */

const ROOT_GRADLE = `buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
        classpath 'com.google.gms:google-services:4.4.4'
        classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
    }
}
`;

const APP_GRADLE = `apply plugin: 'com.android.application'
if (file('google-services.json').exists()) {
    apply plugin: 'com.google.gms.google-services'
    apply plugin: 'com.google.firebase.crashlytics'
}
android {
    signingConfigs {
        release {
            if (project.hasProperty('MASARIFI_RELEASE_STORE_FILE') && file(MASARIFI_RELEASE_STORE_FILE).exists()) {
                storeFile file(MASARIFI_RELEASE_STORE_FILE)
            }
        }
    }
}
`;

const CAP_GRADLE = `dependencies {
    implementation project(':capacitor-firebase-crashlytics')
}
`;

/** Valid google-services.json for the expected package. */
const VALID_GS = JSON.stringify({
  project_info: {
    project_number: '123456789000',
    project_id: 'masarifi-prod',
  },
  client: [
    {
      client_info: {
        mobilesdk_app_id: '1:123456789000:android:abcdef0123456789',
        android_client_info: { package_name: EXPECTED_PACKAGE },
      },
      api_key: [{ current_key: 'AIzaSyFakeKeyForTests1234567890' }],
      services: {},
    },
  ],
});

function makeRepo(root: string, opts: { gs?: string | null; appGradle?: string } = {}) {
  fs.mkdirSync(path.join(root, 'android', 'app'), { recursive: true });
  fs.writeFileSync(path.join(root, 'android', 'build.gradle'), ROOT_GRADLE);
  fs.writeFileSync(
    path.join(root, 'android', 'app', 'build.gradle'),
    opts.appGradle ?? APP_GRADLE
  );
  fs.writeFileSync(path.join(root, 'android', 'app', 'capacitor.build.gradle'), CAP_GRADLE);
  if (opts.gs !== null && opts.gs !== undefined) {
    fs.writeFileSync(path.join(root, 'android', 'app', 'google-services.json'), opts.gs);
  }
}

describe('Directive 17 part 2 — Crashlytics readiness gate', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'masarifi-gs-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('no file → safely inert, structural checks all green', () => {
    makeRepo(tmp);
    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.activated).toBe(false);
    expect(r.ok).toBe(true);
    expect(r.checks).toHaveLength(5);
    expect(r.checks.every((c: { pass: boolean }) => c.pass)).toBe(true);
  });

  it('valid file → activated and fully green', () => {
    makeRepo(tmp, { gs: VALID_GS });
    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.activated).toBe(true);
    expect(r.ok).toBe(true);
    const names = r.checks.map((c: { name: string }) => c.name);
    expect(names).toContain('google-services.json parses as JSON');
    expect(names).toContain(`a client targets package name "${EXPECTED_PACKAGE}"`);
    expect(names).toContain('target client has a mobilesdk_app_id');
    expect(names).toContain('target client carries an API key');
    expect(names).toContain('project_info.project_id present');
  });

  it('file for a DIFFERENT package → RED, and the message names both sides', () => {
    const other = JSON.parse(VALID_GS);
    other.client[0].client_info.android_client_info.package_name = 'com.other.app';
    makeRepo(tmp, { gs: JSON.stringify(other) });

    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.activated).toBe(true);
    expect(r.ok).toBe(false);
    const pkgCheck = r.checks.find(
      (c: { name: string }) => c.name.includes('targets package name')
    )!;
    expect(pkgCheck.pass).toBe(false);
    expect(pkgCheck.detail).toContain('com.other.app');
    expect(pkgCheck.detail).toContain(EXPECTED_PACKAGE);
  });

  it('malformed JSON → RED with the parse error', () => {
    makeRepo(tmp, { gs: '{not json at all' });
    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.activated).toBe(true);
    expect(r.ok).toBe(false);
    const parseCheck = r.checks.find((c: { name: string }) => c.name.includes('parses as JSON'))!;
    expect(parseCheck.pass).toBe(false);
    expect(parseCheck.detail).toBeTruthy();
  });

  it('missing mobilesdk_app_id → RED (the plugin generates resources from it)', () => {
    const broken = JSON.parse(VALID_GS);
    delete broken.client[0].client_info.mobilesdk_app_id;
    makeRepo(tmp, { gs: JSON.stringify(broken) });
    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.ok).toBe(false);
    expect(r.checks.find((c: { name: string }) => c.name.includes('mobilesdk_app_id'))!.pass).toBe(false);
  });

  it('structural regression (conditional block removed) → RED even with no file', () => {
    makeRepo(tmp, { appGradle: "apply plugin: 'com.android.application'\n" });
    const r = verifyCrashlyticsReadiness(tmp);
    expect(r.activated).toBe(false);
    expect(r.ok).toBe(false);
    expect(r.checks.find((c: { name: string }) => c.name.includes('conditional activation block'))!.pass).toBe(false);
  });
});
