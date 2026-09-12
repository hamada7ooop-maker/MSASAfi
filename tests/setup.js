// Polyfill structuredClone for older Node.js (required by fake-indexeddb)
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock environment variables and globals needed for Masarifi tests
const nodeCrypto = require('crypto');

// Provide full Web Crypto API (crypto.subtle) required by encryption middleware
if (!global.crypto || !global.crypto.subtle) {
  global.crypto = {
    ...nodeCrypto.webcrypto,
    subtle: nodeCrypto.webcrypto.subtle,
    getRandomValues: (arr) => nodeCrypto.randomFillSync(arr),
  };
}

// Use fake-indexeddb for Dexie tests
require('fake-indexeddb/auto');

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = value.toString(); },
    clear() { store = {}; },
    removeItem(key) { delete store[key]; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Toast and global state if needed
window.toast = vi.fn();
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
