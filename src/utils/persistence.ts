import type { MapData } from '../types';
import { normalizeMapData } from './mapSchema';

const MAP_STORAGE_PREFIX = 'mindflow_';
const MAP_BACKUP_PREFIX = 'mindflow_backups_';
const MAX_MAP_BACKUPS = 24;
const BACKUP_INTERVAL_MS = 30_000;

type MapBackupSnapshot = {
  savedAt: number;
  snapshot: string;
};

const getMapStorageKey = (id: string) => `${MAP_STORAGE_PREFIX}${id}`;
const getMapBackupKey = (id: string) => `${MAP_BACKUP_PREFIX}${id}`;

const parseBackups = (raw: string | null): MapBackupSnapshot[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const savedAt = typeof entry.savedAt === 'number' ? entry.savedAt : Date.now();
        const snapshot = typeof entry.snapshot === 'string' ? entry.snapshot : '';
        if (!snapshot) return null;
        return { savedAt, snapshot } as MapBackupSnapshot;
      })
      .filter((entry): entry is MapBackupSnapshot => !!entry);
  } catch {
    return [];
  }
};

const tryNormalizeMap = (raw: string | null): MapData | null => {
  if (!raw) return null;

  try {
    return normalizeMapData(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const persistMapData = (mapData: MapData, options?: { forceBackup?: boolean }) => {
  if (typeof window === 'undefined') return;

  const serialized = JSON.stringify(mapData);
  const storageKey = getMapStorageKey(mapData.id);
  const backupKey = getMapBackupKey(mapData.id);
  const forceBackup = options?.forceBackup === true;

  window.localStorage.setItem(storageKey, serialized);

  const existingBackups = parseBackups(window.localStorage.getItem(backupKey));
  const latestBackup = existingBackups[existingBackups.length - 1];
  const shouldCreateBackup =
    forceBackup ||
    !latestBackup ||
    (latestBackup.snapshot !== serialized && mapData.lastEdited - latestBackup.savedAt >= BACKUP_INTERVAL_MS);

  if (!shouldCreateBackup) return;

  const nextBackups = existingBackups
    .concat({
      savedAt: mapData.lastEdited,
      snapshot: serialized,
    })
    .slice(-MAX_MAP_BACKUPS);

  window.localStorage.setItem(backupKey, JSON.stringify(nextBackups));
};

export const loadMapDataWithRecovery = (id: string): MapData | null => {
  if (typeof window === 'undefined') return null;

  const storageKey = getMapStorageKey(id);
  const primaryData = tryNormalizeMap(window.localStorage.getItem(storageKey));
  if (primaryData) return primaryData;

  const backups = parseBackups(window.localStorage.getItem(getMapBackupKey(id)));
  for (let index = backups.length - 1; index >= 0; index -= 1) {
    const recovered = tryNormalizeMap(backups[index]?.snapshot || null);
    if (!recovered) continue;
    window.localStorage.setItem(storageKey, JSON.stringify(recovered));
    return recovered;
  }

  return null;
};

export const deleteStoredMapData = (id: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getMapStorageKey(id));
  window.localStorage.removeItem(getMapBackupKey(id));
};
