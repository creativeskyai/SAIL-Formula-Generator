import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView; stub it so components that call it
// during keyboard navigation (e.g. VariableCombobox) don't emit "Not
// implemented" noise or throw in tests.
Element.prototype.scrollIntoView = () => {};

// Node >= 22 ships an experimental global `localStorage` that is a broken stub
// unless --localstorage-file is passed, and it shadows jsdom's working
// implementation (it even ends up as `window.localStorage` in the test env).
// When the Storage API is missing, install an in-memory polyfill so tests
// behave the same on every Node version.
if (typeof globalThis.localStorage?.clear !== 'function') {
  let data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => void (data = new Map()),
  };
  for (const target of [globalThis, window] as const) {
    Object.defineProperty(target, 'localStorage', {
      value: memoryStorage,
      writable: true,
      configurable: true,
    });
  }
}
