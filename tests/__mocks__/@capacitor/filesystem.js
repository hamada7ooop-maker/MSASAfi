// Mock for @capacitor/filesystem
// Fixes failing test suites: db.test.js, i18n.test.js, integration.test.js, utils.test.js

export const Directory = {
  Documents: 'DOCUMENTS',
  Data: 'DATA',
  Cache: 'CACHE',
  External: 'EXTERNAL',
  ExternalStorage: 'EXTERNAL_STORAGE',
  Library: 'LIBRARY',
};

export const Encoding = {
  UTF8: 'utf8',
  ASCII: 'ascii',
  UTF16: 'utf16',
};

const _store = {};

export const Filesystem = {
  readFile: jest.fn(async ({ path }) => {
    if (_store[path]) return { data: _store[path] };
    throw new Error(`File not found: ${path}`);
  }),

  writeFile: jest.fn(async ({ path, data }) => {
    _store[path] = data;
    return { uri: `file://${path}` };
  }),

  deleteFile: jest.fn(async ({ path }) => {
    delete _store[path];
  }),

  mkdir: jest.fn(async () => {}),

  readdir: jest.fn(async () => ({ files: [] })),

  getUri: jest.fn(async ({ path }) => ({ uri: `file://${path}` })),

  stat: jest.fn(async ({ path }) => ({
    type: 'file',
    size: _store[path] ? _store[path].length : 0,
    ctime: Date.now(),
    mtime: Date.now(),
    uri: `file://${path}`,
  })),

  copy: jest.fn(async () => {}),

  rename: jest.fn(async () => {}),
};

export default Filesystem;
