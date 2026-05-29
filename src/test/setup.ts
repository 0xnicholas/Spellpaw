import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';

class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}
Object.defineProperty(globalThis, 'localStorage', { value: new LocalStorageMock() });

beforeEach(async () => {
  // Clear IndexedDB between tests so that asynchronous rehydration
  // from a previous test does not leak into the next one.
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('spellpaw-db');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('IDB delete failed'));
    req.onblocked = () => resolve();
  });
});
