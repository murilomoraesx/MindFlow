import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type ServerRole = 'master' | 'collaborator' | 'client';
export type ServerUserStatus = 'active' | 'revoked';

export type ServerUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: ServerRole;
  status: ServerUserStatus;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
};

export type ServerSession = {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
};

export type ServerProject = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: number;
  lastEdited: number;
};

export type ServerMap = {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  settings: Record<string, unknown>;
  lastEdited: number;
  schemaVersion: number;
};

export type ServerAudit = {
  id: string;
  actorUserId?: string;
  targetUserId?: string;
  action: string;
  createdAt: number;
  meta?: Record<string, unknown>;
};

export type ServerState = {
  users: ServerUser[];
  sessions: ServerSession[];
  projects: ServerProject[];
  maps: ServerMap[];
  audits: ServerAudit[];
};

const DEFAULT_DATA_ROOT =
  process.env.MINDFLOW_DATA_DIR ||
  (process.env.HOME ? path.join(process.env.HOME, '.mindflow-data') : path.resolve(process.cwd(), '..', '.mindflow-data'));
const DATA_DIR = path.resolve(DEFAULT_DATA_ROOT);
const DB_FILE = path.join(DATA_DIR, 'mindflow-server.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LEGACY_DATA_DIR = path.resolve(process.cwd(), 'data');
const LEGACY_DB_FILE = path.join(LEGACY_DATA_DIR, 'mindflow-server.json');
const LEGACY_BACKUP_DIR = path.join(LEGACY_DATA_DIR, 'backups');
const MAX_BACKUPS = 20;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const INITIAL_STATE: ServerState = {
  users: [],
  sessions: [],
  projects: [],
  maps: [],
  audits: [],
};

const ensureDirectories = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
};

const migrateLegacyDataIfNeeded = () => {
  ensureDirectories();
  if (fs.existsSync(DB_FILE)) return;
  if (!fs.existsSync(LEGACY_DB_FILE)) return;

  fs.copyFileSync(LEGACY_DB_FILE, DB_FILE);

  if (fs.existsSync(LEGACY_BACKUP_DIR)) {
    const entries = fs.readdirSync(LEGACY_BACKUP_DIR, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isFile() || !entry.name.endsWith('.json')) return;
      const from = path.join(LEGACY_BACKUP_DIR, entry.name);
      const to = path.join(BACKUP_DIR, entry.name);
      if (!fs.existsSync(to)) {
        fs.copyFileSync(from, to);
      }
    });
  }
};

const cloneState = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const writeAtomic = (filePath: string, content: string) => {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
};

const rotateBackups = () => {
  const backups = fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => ({
      path: path.join(BACKUP_DIR, entry.name),
      time: Number(entry.name.split('-')[0]) || 0,
    }))
    .sort((a, b) => b.time - a.time);

  backups.slice(MAX_BACKUPS).forEach((backup) => {
    fs.unlinkSync(backup.path);
  });
};

const normalizeState = (raw: unknown): ServerState => {
  if (!raw || typeof raw !== 'object') return cloneState(INITIAL_STATE);
  const value = raw as Partial<ServerState>;
  return {
    users: Array.isArray(value.users) ? value.users : [],
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
    maps: Array.isArray(value.maps) ? value.maps : [],
    audits: Array.isArray(value.audits) ? value.audits : [],
  };
};

export const readState = (): ServerState => {
  migrateLegacyDataIfNeeded();
  if (!fs.existsSync(DB_FILE)) {
    writeAtomic(DB_FILE, JSON.stringify(INITIAL_STATE, null, 2));
    return cloneState(INITIAL_STATE);
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return normalizeState(JSON.parse(raw));
  } catch {
    return cloneState(INITIAL_STATE);
  }
};

export const writeState = (state: ServerState) => {
  migrateLegacyDataIfNeeded();
  const snapshot = JSON.stringify(state, null, 2);
  writeAtomic(DB_FILE, snapshot);
  writeAtomic(path.join(BACKUP_DIR, `${Date.now()}-mindflow-server.json`), snapshot);
  rotateBackups();
};

export const updateState = <T>(updater: (draft: ServerState) => T): T => {
  const draft = readState();
  const result = updater(draft);
  writeState(draft);
  return result;
};

export const hashPassword = (password: string, salt = crypto.randomBytes(16).toString('hex')) => {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, passwordHash };
};

export const verifyPassword = (password: string, salt: string, expectedHash: string) => {
  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

export const sanitizeUser = (user: ServerUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

export const ensureMasterUser = () => {
  const email = String(process.env.MINDFLOW_MASTER_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.MINDFLOW_MASTER_PASSWORD || '').trim();
  const name = String(process.env.MINDFLOW_MASTER_NAME || 'Administrador').trim();

  if (!email || !password) {
    throw new Error('MINDFLOW_MASTER_EMAIL e MINDFLOW_MASTER_PASSWORD são obrigatórios para iniciar o backend.');
  }

  updateState((state) => {
    const now = Date.now();
    const existing = state.users.find((user) => user.email === email);
    const nextHash = hashPassword(password, existing?.passwordSalt);

    if (existing) {
      existing.name = name;
      existing.role = 'master';
      existing.status = 'active';
      existing.passwordHash = nextHash.passwordHash;
      existing.passwordSalt = nextHash.salt;
      existing.updatedAt = now;
      return;
    }

    state.users.push({
      id: crypto.randomUUID(),
      name,
      email,
      role: 'master',
      status: 'active',
      passwordHash: nextHash.passwordHash,
      passwordSalt: nextHash.salt,
      createdAt: now,
      updatedAt: now,
    });
  });
};

export const createSession = (userId: string) =>
  updateState((state) => {
    const now = Date.now();
    const session: ServerSession = {
      id: crypto.randomUUID(),
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    state.sessions = state.sessions.filter((item) => item.expiresAt > now);
    state.sessions.push(session);
    return session;
  });

export const findSessionUser = (sessionId?: string | null) => {
  if (!sessionId) return null;
  const state = readState();
  const now = Date.now();
  const session = state.sessions.find((item) => item.id === sessionId && item.expiresAt > now);
  if (!session) return null;
  return state.users.find((item) => item.id === session.userId && item.status === 'active') || null;
};

export const destroySession = (sessionId?: string | null) => {
  if (!sessionId) return;
  updateState((state) => {
    state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  });
};

export const touchUserLogin = (userId: string) => {
  updateState((state) => {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;
    user.lastLoginAt = Date.now();
    user.updatedAt = Date.now();
  });
};

export const logAudit = (entry: Omit<ServerAudit, 'id' | 'createdAt'>) => {
  updateState((state) => {
    state.audits.push({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...entry,
    });
  });
};
