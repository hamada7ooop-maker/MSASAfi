/**
 * Masarifi - AES-GCM Crypto Utilities
 * Handles master key derivation, data encryption, and decryption.
 * NO dependencies on state or DB to prevent circular loops.
 */

let _encryptionKey: CryptoKey | null = null;

/**
 * Derive a CryptoKey from PIN + salt using PBKDF2 → AES-GCM.
 * Iterations: 600,000 (SHA-256)
 */
export async function deriveMasterKey(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', 
    enc.encode(pin), 
    { name: 'PBKDF2' }, 
    false, 
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    { 
      name: 'PBKDF2', 
      salt: enc.encode(salt), 
      iterations: 600000, 
      hash: 'SHA-256' 
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 256-bit AES-GCM Master Data Key (MDK).
 */
export async function generateMasterDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, 
    ['encrypt', 'decrypt']
  ) as Promise<CryptoKey>;
}

/**
 * Export a CryptoKey and encrypt it with the Key Encryption Key (KEK).
 */
export async function encryptKey(keyToEncrypt: CryptoKey, kek: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', keyToEncrypt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    rawKey
  );
  
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  
  return uint8ArrayToBase64(combined);
}

/**
 * Decrypt a Base64 string with the KEK and import it as a CryptoKey.
 */
export async function decryptKey(encryptedKeyBase64: string, kek: CryptoKey): Promise<CryptoKey> {
  const combined = base64ToUint8Array(encryptedKeyBase64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const rawKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    kek,
    ciphertext
  );
  
  return crypto.subtle.importKey(
    'raw', 
    rawKey, 
    { name: 'AES-GCM' }, 
    false, 
    ['encrypt', 'decrypt']
  );
}

// In-memory key management
export function setEncryptionKey(key: CryptoKey | null) { _encryptionKey = key; }
export function getEncryptionKey(): CryptoKey | null { return _encryptionKey; }
export function clearEncryptionKey() { _encryptionKey = null; }
export function isEncryptionKeyReady(): boolean { return _encryptionKey !== null; }

/**
 * Encrypt a plain object → Base64 string (iv + ciphertext).
 */
export async function encryptData<T = unknown>(plainObject: T): Promise<string> {
  if (!_encryptionKey) throw new Error('Encryption key not loaded');
  
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    _encryptionKey,
    enc.encode(JSON.stringify(plainObject))
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  
  return uint8ArrayToBase64(combined);
}

/**
 * Decrypt a Base64 string → plain object.
 */
export async function decryptData<T = unknown>(base64String: string): Promise<T> {
  if (!_encryptionKey) throw new Error('Encryption key not loaded');
  
  const combined = base64ToUint8Array(base64String);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const dec = new TextDecoder();
  
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    _encryptionKey,
    ciphertext
  );
  
  return JSON.parse(dec.decode(plainBuffer)) as T;
}

// Helper: Safe Base64 encoding for large arrays
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < arr.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(arr.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

// Helper: Safe Base64 decoding
function base64ToUint8Array(str: string): Uint8Array {
  const binary = atob(str);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}
