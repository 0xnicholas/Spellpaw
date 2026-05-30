import { openDB } from 'idb';
import { DB_NAME, DB_VERSION } from './idbStorage';

const MIGRATION_KEY = 'spellpaw_idb_migration_v1';

function hasMigrated(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'done';
  } catch {
    return false;
  }
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch {
    // ignore
  }
}

function getLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

interface MigrationMapping {
  lsKey: string;
  idbStore: string;
  idbKey: string;
}

const mappings: MigrationMapping[] = [
  { lsKey: 'spellpaw_project', idbStore: 'projectStore', idbKey: 'spellpaw_project' },
  { lsKey: 'spellpaw_canvas', idbStore: 'canvasStore', idbKey: 'spellpaw_canvas' },
  { lsKey: 'spellpaw_chat', idbStore: 'chatStore', idbKey: 'spellpaw_chat' },
];

/**
 * One-time migration of Zustand persist data from localStorage to IndexedDB.
 * Auth token stays in localStorage (small, safe).
 */
export async function migrateToIDB(): Promise<void> {
  if (hasMigrated()) return;

  // Ensure DB exists before writing. Use the same version as idbStorage
  // so that the migration does not fail if the DB was already created.
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const stores = ['projectStore', 'canvasStore', 'chatStore'];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    },
  });

  for (const { lsKey, idbStore, idbKey } of mappings) {
    const value = getLocalStorageItem(lsKey);
    if (value) {
      await db.put(idbStore, value, idbKey);
    }
  }

  // Clean up old localStorage keys (keep auth)
  for (const { lsKey } of mappings) {
    removeLocalStorageItem(lsKey);
  }

  markMigrated();
}
