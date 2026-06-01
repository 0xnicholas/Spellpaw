import { openDB, type IDBPDatabase } from 'idb';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

export const DB_NAME = 'spellpaw-db';
export const DB_VERSION = 3;

const isTestEnv = import.meta.env?.MODE === 'test';

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

/** Shared DB instance — used by both Zustand persist and snapshot service */
export async function getSpellpawDB(): Promise<IDBPDatabase<unknown>> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const stores = ['projectStore', 'canvasStore', 'chatStore', 'snapshots', 'taskStore'];
        for (const store of stores) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store);
          }
        }
      },
    });
  }
  return dbPromise;
}

export function createIDBStorage<S>(storeName: string): PersistStorage<S> {
  // In test environment, fall back to localStorage for predictable
  // synchronous behaviour across parallel test files.
  if (isTestEnv) {
    return {
      getItem: async (name: string) => {
        const str = localStorage.getItem(name);
        if (!str) return null;
        return JSON.parse(str) as StorageValue<S>;
      },
      setItem: async (name: string, value: StorageValue<S>) => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: async (name: string) => {
        localStorage.removeItem(name);
      },
    };
  }

  return {
    getItem: async (name: string) => {
      const db = await getSpellpawDB();
      const value = await db.get(storeName, name);
      if (typeof value !== 'string') return null;
      try {
        return JSON.parse(value) as StorageValue<S>;
      } catch {
        return null;
      }
    },
    setItem: async (name: string, value: StorageValue<S>) => {
      const db = await getSpellpawDB();
      await db.put(storeName, JSON.stringify(value), name);
    },
    removeItem: async (name: string) => {
      const db = await getSpellpawDB();
      await db.delete(storeName, name);
    },
  };
}
