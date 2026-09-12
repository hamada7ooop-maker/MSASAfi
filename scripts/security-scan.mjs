import fs from 'fs';
import path from 'path';

console.log('🔍 Starting Masarifi Security Scan...');

const srcDir = './src';
let issuesFound = 0;

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for hardcoded keys
      if (/AIzaSy[A-Za-z0-9-_]{33}/.test(content)) {
        console.error(`🚨 CRITICAL: Possible Google API Key found in ${fullPath}`);
        issuesFound++;
      }
      
      // Check for raw innerHTML assignments (we should use safeInnerHTML)
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('.innerHTML =') && !line.includes('safeInnerHTML')) {
          console.warn(`⚠️ WARNING: Unsafe innerHTML assignment in ${fullPath}:${index + 1}. Consider using safeInnerHTML().`);
        }
        if (line.includes('eval(')) {
          console.error(`🚨 CRITICAL: eval() used in ${fullPath}:${index + 1}.`);
          issuesFound++;
        }
      });
    }
  }
}

scanDirectory(srcDir);

if (issuesFound > 0) {
  console.log(`\n❌ Scan completed with ${issuesFound} critical issues.`);
  process.exit(1);
} else {
  console.log('\n✅ Security Scan Passed! No critical issues found.');
  process.exit(0);
}
