import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { packageCleanSource } from './package-clean-source.mjs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let version = packageJson.version;

// Smart version bump — handles rollover (19.9.9 → 20.0.0, 1.9.9 → 2.0.0)
const parts = version.split('.').map(Number);
if (parts.length === 3) {
    parts[2] += 1;          // bump patch
    if (parts[2] >= 20) { parts[2] = 0; parts[1] += 1; }  // patch rollover
    if (parts[1] >= 10) { parts[1] = 0; parts[0] += 1; }  // minor rollover
    version = parts.join('.');
    packageJson.version = version;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 4));
    console.log(`🆙 Version bumped to v${version}`);
}

const projectName = "Masarifi";

console.log(`🚀 Starting Release Process for v${version}...`);

// 0. Validate Translations
console.log("🛡️ Validating translations...");
try {
    execSync('node scripts/guardian.mjs validate', { stdio: 'inherit' });
} catch (e) {
    console.error("🚨 Release ABORTED: Translation validation failed. Fix errors before releasing.");
    process.exit(1);
}

try {
    // Update GEMINI.md version status
    let gemini = fs.readFileSync('GEMINI.md', 'utf8');
    gemini = gemini.replace(/# Masarifi Project Status \(v\d+\.\d+\.\d+\)/, `# Masarifi Project Status (v${version})`);
    gemini = gemini.replace(/- \*\*Current Version\*\*: \d+\.\d+\.\d+/, `- **Current Version**: ${version}`);
    fs.writeFileSync('GEMINI.md', gemini);
    console.log("📝 Updated GEMINI.md");

    // Update PROJECT_DOCUMENTATION.md version title
    if (fs.existsSync('PROJECT_DOCUMENTATION.md')) {
        let doc = fs.readFileSync('PROJECT_DOCUMENTATION.md', 'utf8');
        doc = doc.replace(/# دليل مشروع مصاريفي \(Masarifi\) الشامل - v\d+\.\d+\.\d+/, `# دليل مشروع مصاريفي (Masarifi) الشامل - v${version}`);
        fs.writeFileSync('PROJECT_DOCUMENTATION.md', doc);
        console.log("📝 Updated PROJECT_DOCUMENTATION.md");
    }

    // Update constants.ts APP_VERSION
    if (fs.existsSync('src/core/constants.ts')) {
        let constants = fs.readFileSync('src/core/constants.ts', 'utf8');
        constants = constants.replace(/export const APP_VERSION = '[\d.]+';/, `export const APP_VERSION = '${version}';`);
        fs.writeFileSync('src/core/constants.ts', constants);
        console.log("📝 Updated constants.ts APP_VERSION");
    }

    // Update Settings.tsx version footer
    let settings = fs.readFileSync('src/features/settings/components/Settings.tsx', 'utf8');
    settings = settings.replace(/Masarifi V\d+\.\d+\.\d+/, `Masarifi V${version}`);
    fs.writeFileSync('src/features/settings/components/Settings.tsx', settings);
    console.log("📝 Updated Settings.tsx version");

    // Update splash footer in onboarding.ts / onboarding.js
    const onboardingPath = fs.existsSync('src/core/onboarding.ts') ? 'src/core/onboarding.ts' : 'src/core/onboarding.js';
    if (fs.existsSync(onboardingPath)) {
        let onboarding = fs.readFileSync(onboardingPath, 'utf8');
        onboarding = onboarding.replace(/Masarifi V\d+\.\d+\.\d+/, `Masarifi V${version}`);
        fs.writeFileSync(onboardingPath, onboarding);
        console.log(`📝 Updated ${onboardingPath} splash version`);
    }

    // Update Service Worker cache version
    let sw = fs.readFileSync('public/sw.js', 'utf8');
    sw = sw.replace(/const CACHE_VERSION = 'masarifi-v[\d-]+';/, `const CACHE_VERSION = 'masarifi-v${version.replace(/\./g, '-')}';`);
    sw = sw.replace(/\/\/ مصاريفي — Service Worker v[\d.]+/, `// مصاريفي — Service Worker v${version}`);
    fs.writeFileSync('public/sw.js', sw);
    console.log("📝 Updated sw.js cache version");

    // Update Dashboard.tsx version footer
    let dashboard = fs.readFileSync('src/features/home/components/Dashboard.tsx', 'utf8');
    dashboard = dashboard.replace(/MASARIFI INTELLIGENCE ENGINE V\d+\.\d+\.\d+/, `MASARIFI INTELLIGENCE ENGINE V${version}`);
    fs.writeFileSync('src/features/home/components/Dashboard.tsx', dashboard);
    console.log("📝 Updated Dashboard.tsx version");

    // Update About.tsx version string
    let about = fs.readFileSync('src/features/about/components/About.tsx', 'utf8');
    about = about.replace(/v\d+\.\d+\.\d+/, `v${version}`);
    fs.writeFileSync('src/features/about/components/About.tsx', about);
    console.log("📝 Updated About.tsx version");

    // Update android/app/build.gradle versions
    if (fs.existsSync('android/app/build.gradle')) {
        let buildGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
        buildGradle = buildGradle.replace(/versionCode \d+/, `versionCode ${version.replace(/\./g, '')}`);
        buildGradle = buildGradle.replace(/versionName "[^"]+"/, `versionName "${version}"`);
        fs.writeFileSync('android/app/build.gradle', buildGradle);
        console.log("📝 Updated android/app/build.gradle versions");
    }

    // Update every locale file. Arabic used to sit apart in
    // src/translations.js; it now lives in src/locales/ar.js with the rest so
    // it can be code-split, and this glob therefore already covers it.
    const translationFiles = fs
        .readdirSync('src/locales')
        .map(f => path.join('src/locales', f));
    translationFiles.forEach(tf => {
        if (!tf.endsWith('.js')) return;
        let tContent = fs.readFileSync(tf, 'utf8');
        // Better replacement: preserve the prefix (e.g. "نسخه", "Version", "Versión")
        tContent = tContent.replace(/(['"])app\.version\1:\s*(['"])(.*?)\s*v?[\d.]+\2/gi, (m, quote1, quote2, prefix) => {
            const finalPrefix = prefix.trim() || 'Version';
            return `${quote1}app.version${quote1}: ${quote2}${finalPrefix} ${version}${quote2}`;
        });
        // Update any other V-tags
        tContent = tContent.replace(/V\d+\.\d+\.\d+/g, `V${version}`);
        fs.writeFileSync(tf, tContent);
    });
    console.log("📝 Updated version strings in all translation files");

    // 1. Build Web Assets
    // Directive 17 part 2: crash reporting flag mirrors the Gradle-side
    // conditional plugin application. When the owner has placed their
    // google-services.json, the release build carries VITE_CRASH_REPORTING=true
    // and the native plugins activate (android/app/build.gradle applies them
    // only when the file exists). Without the file, reporting stays safely
    // off — the app's runtime gate (isCrashReportingEnabled) is a no-op and
    // nothing crashes. A malformed/mismatched file aborts the release HERE,
    // in milliseconds, with a precise message — instead of as an opaque
    // Gradle failure minutes into assembleRelease.
    const { verifyCrashlyticsReadiness } = await import('./verify-crashlytics-readiness.mjs');
    const readiness = verifyCrashlyticsReadiness(process.cwd());
    if (readiness.activated) {
        for (const c of readiness.checks) {
            if (!c.pass) console.error(`❌  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
        }
        if (!readiness.ok) {
            console.error("🚨 Release ABORTED: google-services.json is present but invalid (see ❌ above). Fix it or remove it, then re-run.");
            process.exit(1);
        }
        process.env.VITE_CRASH_REPORTING = 'true';
        console.log("🔥 google-services.json verified — building with VITE_CRASH_REPORTING=true (Crashlytics ACTIVE).");
    } else {
        delete process.env.VITE_CRASH_REPORTING;
        console.warn("⚠️  android/app/google-services.json NOT found — building WITHOUT crash reporting.");
        console.warn("    To activate: place the file from the Firebase Console, then re-run the release.");
    }
    console.log("📦 Building web assets...");
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Sync Capacitor
    console.log("🔄 Syncing Capacitor...");
    execSync('npx cap sync', { stdio: 'inherit' });

    // 3. Build Signed Release APK
    console.log("🔐 Building Signed Release APK with Gradle...");
    try {
        if (!process.env.JAVA_HOME && fs.existsSync('C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.7-hotspot')) {
            process.env.JAVA_HOME = 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.7-hotspot';
        }
        const isWindows = process.platform === 'win32';
        const gradleCmd = isWindows ? 'gradlew.bat' : './gradlew';

        // assembleRelease uses the signingConfig defined in build.gradle
        execSync(`${gradleCmd} assembleRelease`, {
            cwd: path.join(process.cwd(), 'android'),
            stdio: 'inherit'
        });

        // Signed release APK output path
        const sourceApk = path.join(
            'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'
        );
        const targetApk = `${projectName}_V${version}_Signed_Release.apk`;

        if (fs.existsSync(sourceApk)) {
            fs.copyFileSync(sourceApk, targetApk);
            console.log(`✅ Signed Release APK: ${targetApk}`);
        } else {
            // Fallback: check for unsigned (if signing config missing)
            const unsignedApk = path.join(
                'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'
            );
            if (fs.existsSync(unsignedApk)) {
                fs.copyFileSync(unsignedApk, `${projectName}_V${version}_Unsigned_Release.apk`);
                console.warn("⚠️ Signing config missing — copied unsigned APK. Check gradle.properties.");
            } else {
                console.warn("⚠️ APK built but not found at expected path.");
            }
        }
    } catch (e) {
        console.warn("⚠️ Gradle build failed. Ensure JAVA_HOME and Android SDK are configured.");
        console.error(e.message);
    }

    // 4. Create Clean Source ZIP using dedicated packager
    await packageCleanSource(version);

} catch (error) {
    console.error("❌ Release Process Failed:", error.message);
    process.exit(1);
}
