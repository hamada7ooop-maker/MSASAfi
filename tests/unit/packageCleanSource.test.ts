import { describe, it, expect } from 'vitest';
import path from 'node:path';

/**
 * Filter logic mirrored directly from scripts/package-clean-source.mjs
 * to guard against regression where build.gradle and settings.gradle
 * were mistakenly stripped due to a loose .gradle substring check.
 */
function shouldExcludeAndroidPath(rel: string): boolean {
  if (!rel || rel === '.') return false;
  const segments = rel.split(path.sep);
  if (
    segments.includes('.gradle') ||
    segments.includes('.kotlin') ||
    segments.includes('build') ||
    segments.includes('.idea') ||
    rel.startsWith('app' + path.sep + 'src' + path.sep + 'main' + path.sep + 'assets' + path.sep + 'public') ||
    rel.startsWith('app' + path.sep + 'src' + path.sep + 'main' + path.sep + 'assets' + path.sep + 'capacitor.config.json') ||
    rel.endsWith('.apk') ||
    rel.endsWith('.aab') ||
    rel.endsWith('.keystore') ||
    rel.endsWith('.jks') ||
    rel.endsWith('.log') ||
    rel.startsWith('hs_err_') ||
    rel.startsWith('replay_') ||
    rel.endsWith('google-services.json') ||
    rel === 'local.properties'
  ) {
    return true;
  }
  return false;
}

describe('packageCleanSource filter guard', () => {
  it('must preserve all critical Gradle build files', () => {
    expect(shouldExcludeAndroidPath('build.gradle')).toBe(false);
    expect(shouldExcludeAndroidPath('settings.gradle')).toBe(false);
    expect(shouldExcludeAndroidPath('variables.gradle')).toBe(false);
    expect(shouldExcludeAndroidPath('capacitor.settings.gradle')).toBe(false);
    expect(shouldExcludeAndroidPath('gradle.properties')).toBe(false);
    expect(shouldExcludeAndroidPath('gradlew')).toBe(false);
    expect(shouldExcludeAndroidPath('gradlew.bat')).toBe(false);
    expect(shouldExcludeAndroidPath(['gradle', 'wrapper', 'gradle-wrapper.jar'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['gradle', 'wrapper', 'gradle-wrapper.properties'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['app', 'build.gradle'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['app', 'capacitor.build.gradle'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['app', 'proguard-rules.pro'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['capacitor-cordova-android-plugins', 'build.gradle'].join(path.sep))).toBe(false);
    expect(shouldExcludeAndroidPath(['capacitor-cordova-android-plugins', 'cordova.variables.gradle'].join(path.sep))).toBe(false);
  });

  it('must exclude build caches and hidden tool directories', () => {
    expect(shouldExcludeAndroidPath('.gradle')).toBe(true);
    expect(shouldExcludeAndroidPath(['.gradle', 'caches'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath(['app', '.gradle', 'caches'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath('.kotlin')).toBe(true);
    expect(shouldExcludeAndroidPath(['app', '.kotlin'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath('.idea')).toBe(true);
    expect(shouldExcludeAndroidPath(['.idea', 'workspace.xml'].join(path.sep))).toBe(true);
  });

  it('must exclude build outputs and compiler intermediates', () => {
    expect(shouldExcludeAndroidPath('build')).toBe(true);
    expect(shouldExcludeAndroidPath(['build', 'outputs'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath(['app', 'build'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath(['app', 'build', 'outputs', 'apk'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath(['capacitor-cordova-android-plugins', 'build'].join(path.sep))).toBe(true);
  });

  it('must exclude credentials, local machine files, and binaries', () => {
    expect(shouldExcludeAndroidPath('local.properties')).toBe(true);
    expect(shouldExcludeAndroidPath('masarifi-release.keystore')).toBe(true);
    expect(shouldExcludeAndroidPath(['app', 'release.keystore'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath(['app', 'google-services.json'].join(path.sep))).toBe(true);
    expect(shouldExcludeAndroidPath('app-release.apk')).toBe(true);
    expect(shouldExcludeAndroidPath('app-release.aab')).toBe(true);
    expect(shouldExcludeAndroidPath('build.log')).toBe(true);
  });
});
