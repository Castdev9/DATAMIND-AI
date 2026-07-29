import { AnalysisResult, ChatMessage } from '../types';

export interface SavedReportSnapshot {
  id: string;
  datasetId: string;
  datasetName: string;
  timestamp: number;
  savedAtFormatted: string;
  latestResult: AnalysisResult | null;
  chatHistory: ChatMessage[];
  activeFormat?: string;
  customReportNotes?: string;
  messageCount: number;
}

const DB_NAME = 'DataMindReportCenterDB';
const DB_VERSION = 2;
const STORE_NAME = 'report_analysis_snapshots';
const DRAFT_STORE_NAME = 'chat_message_drafts';

export interface ChatDraftRecord {
  id: string;
  datasetId: string;
  draftText: string;
  updatedAt: number;
}

/**
 * Helper to initialize or open the IndexedDB instance
 */
export function openReportCenterDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('datasetId', 'datasetId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save current chat message draft to IndexedDB
 */
export async function saveChatDraftToIDB(datasetId: string, draftText: string): Promise<void> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const key = datasetId || 'global_draft';
      const record: ChatDraftRecord = {
        id: key,
        datasetId: datasetId || 'global',
        draftText,
        updatedAt: Date.now(),
      };
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save chat draft to IndexedDB:', err);
  }
}

/**
 * Retrieve saved chat message draft from IndexedDB for a given dataset or global
 */
export async function getChatDraftFromIDB(datasetId: string): Promise<string> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readonly');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const key = datasetId || 'global_draft';
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as ChatDraftRecord | undefined;
        resolve(result?.draftText || '');
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get chat draft from IndexedDB:', err);
    return '';
  }
}

/**
 * Clear/delete saved chat message draft from IndexedDB
 */
export async function clearChatDraftFromIDB(datasetId: string): Promise<void> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DRAFT_STORE_NAME);
      const key = datasetId || 'global_draft';
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to clear chat draft from IndexedDB:', err);
  }
}

/**
 * Auto-save or update an analysis state and chat history snapshot in IndexedDB
 */
export async function saveReportStateToIDB(snapshot: SavedReportSnapshot): Promise<void> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(snapshot);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save state to IndexedDB:', err);
  }
}

/**
 * Retrieve the latest saved snapshot for a specific dataset or overall
 */
export async function getLatestReportStateFromIDB(datasetId?: string): Promise<SavedReportSnapshot | null> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: SavedReportSnapshot[] = request.result || [];
        if (results.length === 0) {
          resolve(null);
          return;
        }

        let filtered = results;
        if (datasetId) {
          filtered = results.filter((r) => r.datasetId === datasetId);
        }

        if (filtered.length === 0) {
          // Fallback to absolute latest if no match for dataset
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results[0]);
          return;
        }

        filtered.sort((a, b) => b.timestamp - a.timestamp);
        resolve(filtered[0]);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load latest state from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieve all auto-saved snapshots from IndexedDB
 */
export async function getAllReportSnapshotsFromIDB(): Promise<SavedReportSnapshot[]> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: SavedReportSnapshot[] = request.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to fetch all snapshots from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a specific saved snapshot from IndexedDB
 */
export async function deleteReportSnapshotFromIDB(id: string): Promise<void> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to delete snapshot from IndexedDB:', err);
  }
}

/**
 * Clear all snapshots from IndexedDB
 */
export async function clearAllReportSnapshotsFromIDB(): Promise<void> {
  try {
    const db = await openReportCenterDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB store:', err);
  }
}
