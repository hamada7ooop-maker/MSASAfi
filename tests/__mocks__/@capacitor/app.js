export const App = {
  addListener: jest.fn(),
  removeAllListeners: jest.fn(),
  exitApp: jest.fn(),
  getInfo: jest.fn().mockResolvedValue({ version: '1.0.0', build: '1' })
};
