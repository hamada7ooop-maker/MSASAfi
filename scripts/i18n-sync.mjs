/**
 * Masarifi Unified Localization Tool (i18n-sync)
 * 
 * Supports:
 * - Parity and Coverage Statistics across all 11 supported languages.
 * - JSON Export / Import for Crowdin and Weblate platforms.
 * - Key Synchronization and Integrity Verification.
 */
import fs from "fs";
import path from "path";

const LOCALES_DIR = "src/locales";
const MAIN_FILE = "src/translations.js";
const ALL_LOCALES = ["ar", "en", "fr", "tr", "ur", "ms", "id", "fa", "es", "de", "it"];

async function getLanguageKeys(lang) {
  if (lang === "ar") {
    const mod = await import("../src/translations.js");
    return mod.translations?.ar || {};
  }
  const mod = await import("../src/locales/" + lang + ".js");
  return mod.default || mod["locale_" + lang] || {};
}

async function showStats() {
  console.log("🌐 Masarifi Localization Coverage Statistics\n" + "=".repeat(60));
  const arDict = await getLanguageKeys("ar");
  const arKeys = Object.keys(arDict);
  const totalAr = arKeys.length;
  console.log(`📌 Primary Language (ar): ${totalAr} keys\n`);

  console.log("Lang | Total Keys | Missing | Coverage | Status");
  console.log("-".repeat(60));

  for (const lang of ALL_LOCALES) {
    if (lang === "ar") continue;
    const dict = await getLanguageKeys(lang);
    const count = Object.keys(dict).length;
    const missing = arKeys.filter(k => !(k in dict)).length;
    const percent = ((count / Math.max(totalAr, 1)) * 100).toFixed(1);
    const status = missing === 0 ? "✅ 100%" : `⚠️ ${missing} missing`;
    console.log(`${lang.padEnd(4)} | ${String(count).padStart(10)} | ${String(missing).padStart(7)} | ${(percent + "%").padStart(8)} | ${status}`);
  }
  console.log("=".repeat(60));
}

async function exportForCrowdin(outDir = "i18n-export") {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  console.log(`📦 Exporting standard JSON files to ${outDir}/ for Crowdin / Weblate...`);

  for (const lang of ALL_LOCALES) {
    const dict = await getLanguageKeys(lang);
    const outPath = path.join(outDir, `${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(dict, null, 2), "utf8");
    console.log(`  ✓ ${lang}.json (${Object.keys(dict).length} keys)`);
  }
  console.log("✅ Export completed successfully.");
}

async function importFromCrowdin(inDir = "i18n-export") {
  if (!fs.existsSync(inDir)) {
    console.error(`❌ Input directory ${inDir} does not exist.`);
    return;
  }
  console.log(`📥 Importing translations from ${inDir}/...`);
  for (const lang of ALL_LOCALES) {
    const jsonPath = path.join(inDir, `${lang}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const dict = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    if (lang === "ar") {
      const code = "export const translations = {\n  ar: " + JSON.stringify(dict, null, 2) + "\n};\n";
      fs.writeFileSync(MAIN_FILE, code, "utf8");
    } else {
      const code = "export const locale_" + lang + " = " + JSON.stringify(dict, null, 2) + ";\nexport default locale_" + lang + ";\n";
      fs.writeFileSync(path.join(LOCALES_DIR, `${lang}.js`), code, "utf8");
    }
    console.log(`  ✓ Updated ${lang} (${Object.keys(dict).length} keys)`);
  }
  console.log("✅ Import and code generation completed.");
}

const arg = process.argv[2];
if (arg === "--export") {
  exportForCrowdin(process.argv[3] || "i18n-export");
} else if (arg === "--import") {
  importFromCrowdin(process.argv[3] || "i18n-export");
} else {
  showStats();
}
