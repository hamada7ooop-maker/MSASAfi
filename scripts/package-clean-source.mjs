import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

export async function packageCleanSource(customVersion) {
  const rootDir = process.cwd();
  const tempDir = path.join(rootDir, 'temp_clean_source');
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = customVersion || pkg.version;
  const zipName = `Masarifi_V${version}_Source_Clean.zip`;
  const zipPath = path.join(rootDir, zipName);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const copyList = [
    'src',
    'public',
    'tests',
    'scripts',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'capacitor.config.json',
    'eslint.config.js',
    'index.html',
    '.env.example',
    'PROJECT_DOCUMENTATION.md',
    'GEMINI.md',
    'README.md'
  ];

  for (const item of copyList) {
    const src = path.join(rootDir, item);
    const dst = path.join(tempDir, item);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dst, {
        recursive: true,
        filter: (sourcePath) => {
          const rel = path.relative(src, sourcePath);
          if (
            rel.includes('translations_backup') ||
            rel.includes('coverage') ||
            rel.endsWith('.log') ||
            rel.endsWith('.tmp')
          ) {
            return false;
          }
          return true;
        }
      });
    }
  }

  const androidSrc = path.join(rootDir, 'android');
  const androidDst = path.join(tempDir, 'android');
  if (fs.existsSync(androidSrc)) {
    fs.cpSync(androidSrc, androidDst, {
      recursive: true,
      filter: (src) => {
        const rel = path.relative(androidSrc, src);
        if (
          rel.startsWith('.gradle') ||
          rel.startsWith('.kotlin') ||
          rel.startsWith('build') ||
          rel.includes(path.sep + 'build') ||
          rel.includes('.gradle') ||
          rel.includes('.kotlin') ||
          rel.startsWith('app' + path.sep + 'build') ||
          rel.startsWith('app' + path.sep + 'src' + path.sep + 'main' + path.sep + 'assets' + path.sep + 'public') ||
          rel.startsWith('app' + path.sep + 'src' + path.sep + 'main' + path.sep + 'assets' + path.sep + 'capacitor.config.json') ||
          rel.startsWith('.idea') ||
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
          return false;
        }
        return true;
      }
    });

    // Sanitize gradle.properties in the clean zip to never leak keystore credentials
    const cleanGradleProps = path.join(androidDst, 'gradle.properties');
    if (fs.existsSync(cleanGradleProps)) {
      let props = fs.readFileSync(cleanGradleProps, 'utf8');
      props = props.replace(/MASARIFI_RELEASE_STORE_FILE=.*/g, '# MASARIFI_RELEASE_STORE_FILE=../your-release.keystore');
      props = props.replace(/MASARIFI_RELEASE_STORE_PASSWORD=.*/g, '# MASARIFI_RELEASE_STORE_PASSWORD=your_keystore_password');
      props = props.replace(/MASARIFI_RELEASE_KEY_ALIAS=.*/g, '# MASARIFI_RELEASE_KEY_ALIAS=your_key_alias');
      props = props.replace(/MASARIFI_RELEASE_KEY_PASSWORD=.*/g, '# MASARIFI_RELEASE_KEY_PASSWORD=your_key_password');
      fs.writeFileSync(cleanGradleProps, props);
    }
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`🗜️ Compressing clean source files into ${zipName}...`);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Clean Source ZIP created: ${zipName} (${stats.size} bytes / ${sizeMB} MB)`);

  return {
    zipName,
    zipPath,
    sizeBytes: stats.size,
    sizeMB
  };
}

// Allow direct CLI execution: `node scripts/package-clean-source.mjs`
if (process.argv[1] && process.argv[1].endsWith('package-clean-source.mjs')) {
  packageCleanSource().catch(err => {
    console.error('Packaging failed:', err);
    process.exit(1);
  });
}
