import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ROOT_FILE = './google-services.json';
const ANDROID_FILE = './android/app/google-services.json';
const ENC_FILE = './google-services.json.enc';

function encrypt(password) {
  if (!password) {
    console.error("❌ Please provide a password: node scripts/manage-secrets.mjs encrypt <password>");
    process.exit(1);
  }

  if (!fs.existsSync(ROOT_FILE)) {
    console.error(`❌ Source file ${ROOT_FILE} not found!`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(ROOT_FILE, 'utf8');
    
    // Generate standard key and iv using PBKDF2
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(rawData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Package together: salt (16 bytes) + iv (16 bytes) + encrypted data
    const payload = JSON.stringify({
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      data: encrypted
    });
    
    fs.writeFileSync(ENC_FILE, payload, 'utf8');
    console.log(`🔒 File successfully encrypted and saved to: ${ENC_FILE}`);
    console.log(`⚠️  Make sure you add the original google-services.json files to .gitignore!`);
  } catch (error) {
    console.error("❌ Encryption failed:", error.message);
  }
}

function decrypt(password) {
  if (!password) {
    console.error("❌ Please provide a password: node scripts/manage-secrets.mjs decrypt <password>");
    process.exit(1);
  }

  if (!fs.existsSync(ENC_FILE)) {
    console.error(`❌ Encrypted secrets file ${ENC_FILE} not found!`);
    process.exit(1);
  }

  try {
    const payload = JSON.parse(fs.readFileSync(ENC_FILE, 'utf8'));
    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const encryptedData = payload.data;
    
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Restore to root and android app folder
    fs.writeFileSync(ROOT_FILE, decrypted, 'utf8');
    console.log(`🔓 Restored to root path: ${ROOT_FILE}`);
    
    // Ensure android/app directory exists before writing
    const androidDir = path.dirname(ANDROID_FILE);
    if (fs.existsSync(androidDir)) {
      fs.writeFileSync(ANDROID_FILE, decrypted, 'utf8');
      console.log(`🔓 Restored to android app path: ${ANDROID_FILE}`);
    } else {
      console.warn(`⚠️  Android directory ${androidDir} not found. Skipping android file restoration.`);
    }
    
    console.log("💎 Decryption and secrets restoration COMPLETED successfully!");
  } catch (error) {
    console.error("❌ Decryption failed: Invalid password or corrupted secrets file.");
    process.exit(1);
  }
}

const action = process.argv[2];
const pass = process.argv[3];

if (action === 'encrypt') {
  encrypt(pass);
} else if (action === 'decrypt') {
  decrypt(pass);
} else {
  console.log(`
Masarifi Secrets Manager
Usage:
  node scripts/manage-secrets.mjs encrypt <password>  - Encrypt google-services.json
  node scripts/manage-secrets.mjs decrypt <password>  - Decrypt and restore google-services.json
  `);
}
