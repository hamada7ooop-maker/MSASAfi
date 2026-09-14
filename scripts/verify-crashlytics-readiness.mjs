#!/usr/bin/env node
/**
 * Directive 17 part 2 (authorized in 41707e8), verification item 2 —
 * build & signing integrity gate.
 *
 * The activation checklist collapsed to a single owner step: drop
 * `google-services.json` into `android/app/`. The most likely failure of
 * that step is a WRONG file (mismatched package name, another Firebase
 * project, malformed JSON) — which today would surface only as an opaque
 * Gradle error minutes into `assembleRelease`. This gate surfaces it in
 * milliseconds with a precise message, BEFORE any build starts.
 *
 * Checks:
 *   A. Gradle structure (always):
 *      1. Root build.gradle declares both plugin classpaths.
 *      2. app/build.gradle contains the conditional activation block
 *         (both `apply plugin` lines inside the file-exists guard).
 *      3. The release signing config block is intact (MASARIFI_RELEASE_*).
 *      4. capacitor.build.gradle still wires the native crashlytics project.
 *   B. When google-services.json EXISTS (activation mode):
 *      5. It parses as JSON.
 *      6. Some client targets package name `com.masarifi.app`.
 *      7. That client carries a mobilesdk_app_id and an API key.
 *      8. project_info.project_id is present.
 *
 * Exit codes: 0 = green (either "safely inert" without the file, or fully
 * verified with it). 1 = the file exists but something is wrong — the
 * release script aborts before building.
 *
 * Programmatic API: `verifyCrashlyticsReadiness(rootDir)` returns the report
 * (used by tests/unit/crashlyticsReadiness.test.ts).
 */
import fs from 'fs';
import path from 'path';

export const EXPECTED_PACKAGE = 'com.masarifi.app';

/**
 * @param {string} rootDir — repository root.
 * @returns {{ ok: boolean, activated: boolean, checks: Array<{ name: string, pass: boolean, detail?: string }> }}
 */
export function verifyCrashlyticsReadiness(rootDir) {
  const checks = [];
  const read = (rel) => {
    try {
      return fs.readFileSync(path.join(rootDir, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const add = (name, pass, detail) => checks.push({ name, pass, detail });

  // ── A. Gradle structure (must hold in every state) ──────────────────────
  const rootGradle = read(path.join('android', 'build.gradle'));
  add(
    'root gradle declares google-services classpath',
    !!rootGradle && rootGradle.includes("classpath 'com.google.gms:google-services:"),
    rootGradle ? undefined : 'android/build.gradle not found'
  );
  add(
    'root gradle declares crashlytics classpath',
    !!rootGradle && rootGradle.includes("classpath 'com.google.firebase:firebase-crashlytics-gradle:"),
    rootGradle ? undefined : 'android/build.gradle not found'
  );

  const appGradle = read(path.join('android', 'app', 'build.gradle'));
  const conditionalBlock =
    !!appGradle &&
    appGradle.includes("if (file('google-services.json').exists())") &&
    appGradle.includes("apply plugin: 'com.google.gms.google-services'") &&
    appGradle.includes("apply plugin: 'com.google.firebase.crashlytics'");
  add(
    'app gradle has the conditional activation block',
    conditionalBlock,
    appGradle ? undefined : 'android/app/build.gradle not found'
  );
  add(
    'release signing config block intact (MASARIFI_RELEASE_*)',
    !!appGradle && appGradle.includes("MASARIFI_RELEASE_STORE_FILE") && appGradle.includes('signingConfigs'),
    appGradle ? undefined : 'android/app/build.gradle not found'
  );

  const capGradle = read(path.join('android', 'app', 'capacitor.build.gradle'));
  add(
    'native crashlytics library wired via capacitor',
    !!capGradle && capGradle.includes("project(':capacitor-firebase-crashlytics')"),
    capGradle ? undefined : 'android/app/capacitor.build.gradle not found'
  );

  // ── B. The credential file (only when present) ──────────────────────────
  const gsPath = path.join(rootDir, 'android', 'app', 'google-services.json');
  const fileExists = fs.existsSync(gsPath);
  let activated = false;

  if (!fileExists) {
    // Today's documented, safely-inert state: nothing else to verify.
    activated = false;
  } else {
    activated = true;
    let parsed = null;
    let parseError = '';
    try {
      parsed = JSON.parse(fs.readFileSync(gsPath, 'utf8'));
    } catch (e) {
      parseError = e.message;
    }
    add('google-services.json parses as JSON', !!parsed, parseError || undefined);

    if (parsed) {
      const clients = Array.isArray(parsed.client) ? parsed.client : [];
      const target = clients.find(
        (c) =>
          c?.client_info?.android_client_info?.package_name === EXPECTED_PACKAGE
      );
      add(
        `a client targets package name "${EXPECTED_PACKAGE}"`,
        !!target,
        target
          ? undefined
          : `package names found: ${
              clients
                .map((c) => c?.client_info?.android_client_info?.package_name)
                .filter(Boolean)
                .join(', ') || '(none)'
            } — download the file for the app whose package is ${EXPECTED_PACKAGE}`
      );
      if (target) {
        add(
          'target client has a mobilesdk_app_id',
          typeof target.client_info?.mobilesdk_app_id === 'string' &&
            target.client_info.mobilesdk_app_id.length > 0
        );
        const apiKey =
          Array.isArray(target.api_key) && target.api_key[0]?.current_key;
        add(
          'target client carries an API key',
          typeof apiKey === 'string' && apiKey.length > 0
        );
      }
      add(
        'project_info.project_id present',
        typeof parsed.project_info?.project_id === 'string' &&
          parsed.project_info.project_id.length > 0
      );
    }
  }

  const ok = checks.every((c) => c.pass);
  return { ok, activated, checks };
}

/** CLI entry (repo root = cwd). */
export function main() {
  const report = verifyCrashlyticsReadiness(process.cwd());

  if (!report.activated) {
    console.log('ℹ️  google-services.json not found — safely-inert mode (builds green, reporting off).');
  } else {
    console.log('🔥 google-services.json found — verifying it before anything builds…');
  }
  for (const c of report.checks) {
    console.log(`${c.pass ? '✅' : '❌'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  if (report.ok) {
    console.log(
      report.activated
        ? '✅ Crashlytics readiness: GREEN — activation is fully verified, safe to build.'
        : '✅ Crashlytics readiness: GREEN (inert). Structural checks passed.'
    );
    process.exit(0);
  } else {
    console.error('🚨 Crashlytics readiness: RED — fix the ❌ items above before releasing.');
    process.exit(1);
  }
}

// Run as CLI only when invoked directly (not when imported by tests).
const isDirectRun =
  process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname);
if (isDirectRun) main();
