import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSession,
  destroySession,
  ensureMasterUser,
  findSessionUser,
  hashPassword,
  logAudit,
  readState,
  sanitizeUser,
  touchUserLogin,
  updateState,
  verifyPassword,
  type ServerProject,
  type ServerMap,
  type ServerRole,
} from './dataStore';

const PORT = 3003;
const SESSION_COOKIE = 'mindflow_session';

type AuthedRequest = Request & {
  authUser?: ReturnType<typeof sanitizeUser> & { id: string; role: ServerRole; status: string };
};

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = findSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: 'Sessão inválida.' });
    return;
  }
  req.authUser = sanitizeUser(user) as AuthedRequest['authUser'];
  next();
};

const requireMaster = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.authUser || req.authUser.role !== 'master') {
    res.status(403).json({ error: 'Acesso restrito.' });
    return;
  }
  next();
};

const toProjectMeta = (project: ServerProject, maps: ServerMap[]) => ({
  id: project.id,
  name: project.name,
  description: project.description || '',
  createdAt: project.createdAt,
  lastEdited: project.lastEdited,
  mapCount: maps.filter((map) => map.projectId === project.id).length,
});

const toMapMeta = (map: ServerMap) => ({
  id: map.id,
  name: map.name,
  lastEdited: map.lastEdited,
  nodeCount: Array.isArray(map.nodes) ? map.nodes.length : 0,
  projectId: map.projectId,
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const state = readState();
  const user = state.users.find((item) => item.email === email);

  if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    return;
  }

  const session = createSession(user.id);
  touchUserLogin(user.id);
  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(session.expiresAt),
  });
  logAudit({ actorUserId: user.id, action: 'auth.login' });
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  destroySession(sessionId);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const user = findSessionUser(sessionId);
  if (!user) {
    res.status(401).json({ error: 'Sem sessão.' });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

app.get('/api/projects', requireAuth, (req: AuthedRequest, res) => {
  const state = readState();
  const projects = state.projects
    .filter((project) => project.userId === req.authUser!.id)
    .sort((a, b) => b.lastEdited - a.lastEdited)
    .map((project) => toProjectMeta(project, state.maps));
  res.json({ projects });
});

app.post('/api/projects', requireAuth, (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim() || 'Novo Projeto';
  const description = String(req.body?.description || '').trim();
  const now = Date.now();
  const project: ServerProject = {
    id: crypto.randomUUID(),
    userId: req.authUser!.id,
    name,
    description,
    createdAt: now,
    lastEdited: now,
  };

  updateState((state) => {
    state.projects.push(project);
  });

  logAudit({ actorUserId: req.authUser!.id, action: 'project.create', meta: { projectId: project.id } });
  res.status(201).json({ project: toProjectMeta(project, []) });
});

app.patch('/api/projects/:id', requireAuth, (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const result = updateState((state) => {
    const project = state.projects.find((item) => item.id === req.params.id && item.userId === req.authUser!.id);
    if (!project) return null;
    if (name) project.name = name;
    project.description = description;
    project.lastEdited = Date.now();
    return project;
  });

  if (!result) {
    res.status(404).json({ error: 'Projeto não encontrado.' });
    return;
  }

  res.json({ project: toProjectMeta(result, readState().maps) });
});

app.delete('/api/projects/:id', requireAuth, (req: AuthedRequest, res) => {
  updateState((state) => {
    state.projects = state.projects.filter((item) => !(item.id === req.params.id && item.userId === req.authUser!.id));
    state.maps = state.maps.filter((item) => !(item.projectId === req.params.id && item.userId === req.authUser!.id));
  });
  res.json({ ok: true });
});

app.get('/api/maps', requireAuth, (req: AuthedRequest, res) => {
  const state = readState();
  const maps = state.maps
    .filter((map) => map.userId === req.authUser!.id)
    .sort((a, b) => b.lastEdited - a.lastEdited)
    .map(toMapMeta);
  res.json({ maps });
});

app.get('/api/maps/:id', requireAuth, (req: AuthedRequest, res) => {
  const state = readState();
  const map = state.maps.find((item) => item.id === req.params.id && (item.userId === req.authUser!.id || req.authUser!.role === 'master'));
  if (!map) {
    res.status(404).json({ error: 'Mapa não encontrado.' });
    return;
  }
  res.json({ map });
});

app.post('/api/maps', requireAuth, (req: AuthedRequest, res) => {
  const payload = req.body?.map as Partial<ServerMap> | undefined;
  if (!payload?.id || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
    res.status(400).json({ error: 'Mapa inválido.' });
    return;
  }

  const nextMap: ServerMap = {
    id: payload.id,
    userId: req.authUser!.id,
    projectId: payload.projectId,
    name: String(payload.name || 'Novo Mapa'),
    nodes: payload.nodes,
    edges: payload.edges,
    settings: typeof payload.settings === 'object' && payload.settings ? payload.settings : {},
    lastEdited: typeof payload.lastEdited === 'number' ? payload.lastEdited : Date.now(),
    schemaVersion: typeof payload.schemaVersion === 'number' ? payload.schemaVersion : 1,
  };

  updateState((state) => {
    state.maps = state.maps.filter((item) => !(item.id === nextMap.id && item.userId === req.authUser!.id));
    state.maps.push(nextMap);
    const project = state.projects.find((item) => item.id === nextMap.projectId && item.userId === req.authUser!.id);
    if (project) project.lastEdited = nextMap.lastEdited;
  });

  res.status(201).json({ map: nextMap });
});

app.put('/api/maps/:id', requireAuth, (req: AuthedRequest, res) => {
  const payload = req.body?.map as Partial<ServerMap> | undefined;
  const result = updateState((state) => {
    const map = state.maps.find((item) => item.id === req.params.id && (item.userId === req.authUser!.id || req.authUser!.role === 'master'));
    if (!map) return null;
    map.name = String(payload?.name || map.name);
    map.projectId = typeof payload?.projectId === 'string' ? payload.projectId : map.projectId;
    if (Array.isArray(payload?.nodes)) map.nodes = payload.nodes;
    if (Array.isArray(payload?.edges)) map.edges = payload.edges;
    if (payload?.settings && typeof payload.settings === 'object') map.settings = payload.settings as Record<string, unknown>;
    map.lastEdited = typeof payload?.lastEdited === 'number' ? payload.lastEdited : Date.now();
    map.schemaVersion = typeof payload?.schemaVersion === 'number' ? payload.schemaVersion : map.schemaVersion;
    const project = state.projects.find((item) => item.id === map.projectId && item.userId === map.userId);
    if (project) project.lastEdited = map.lastEdited;
    return map;
  });

  if (!result) {
    res.status(404).json({ error: 'Mapa não encontrado.' });
    return;
  }

  res.json({ map: result });
});

app.delete('/api/maps/:id', requireAuth, (req: AuthedRequest, res) => {
  updateState((state) => {
    state.maps = state.maps.filter((item) => !(item.id === req.params.id && (item.userId === req.authUser!.id || req.authUser!.role === 'master')));
  });
  res.json({ ok: true });
});

app.get('/api/admin/clients', requireAuth, requireMaster, (_req, res) => {
  const state = readState();
  const clients = state.users
    .filter((user) => user.role !== 'master')
    .map((user) => ({
      ...sanitizeUser(user),
      projectCount: state.projects.filter((project) => project.userId === user.id).length,
      mapCount: state.maps.filter((map) => map.userId === user.id).length,
    }))
    .sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
  res.json({ clients });
});

app.post('/api/admin/clients', requireAuth, requireMaster, (req: AuthedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const role = (req.body?.role === 'collaborator' ? 'collaborator' : 'client') as ServerRole;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    return;
  }

  const existing = readState().users.find((user) => user.email === email);
  if (existing) {
    res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
    return;
  }

  const now = Date.now();
  const hash = hashPassword(password);
  const user = updateState((state) => {
    const nextUser = {
      id: crypto.randomUUID(),
      name,
      email,
      role,
      status: 'active' as const,
      passwordHash: hash.passwordHash,
      passwordSalt: hash.salt,
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(nextUser);
    return nextUser;
  });

  logAudit({
    actorUserId: req.authUser!.id,
    targetUserId: user.id,
    action: 'admin.client.create',
    meta: { role: user.role },
  });
  res.status(201).json({ client: sanitizeUser(user) });
});

app.post('/api/admin/clients/:id/revoke', requireAuth, requireMaster, (req: AuthedRequest, res) => {
  const result = updateState((state) => {
    const user = state.users.find((item) => item.id === req.params.id && item.role !== 'master');
    if (!user) return null;
    user.status = 'revoked';
    user.updatedAt = Date.now();
    state.sessions = state.sessions.filter((session) => session.userId !== user.id);
    return user;
  });
  if (!result) {
    res.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }
  logAudit({ actorUserId: req.authUser!.id, targetUserId: result.id, action: 'admin.client.revoke' });
  res.json({ client: sanitizeUser(result) });
});

app.post('/api/admin/clients/:id/restore', requireAuth, requireMaster, (req: AuthedRequest, res) => {
  const result = updateState((state) => {
    const user = state.users.find((item) => item.id === req.params.id && item.role !== 'master');
    if (!user) return null;
    user.status = 'active';
    user.updatedAt = Date.now();
    return user;
  });
  if (!result) {
    res.status(404).json({ error: 'Cliente não encontrado.' });
    return;
  }
  logAudit({ actorUserId: req.authUser!.id, targetUserId: result.id, action: 'admin.client.restore' });
  res.json({ client: sanitizeUser(result) });
});

app.get('/api/admin/clients/:id/maps', requireAuth, requireMaster, (req, res) => {
  const state = readState();
  const maps = state.maps.filter((map) => map.userId === req.params.id).sort((a, b) => b.lastEdited - a.lastEdited).map(toMapMeta);
  res.json({ maps });
});

app.get('/api/admin/maps/:id', requireAuth, requireMaster, (req, res) => {
  const state = readState();
  const map = state.maps.find((item) => item.id === req.params.id);
  if (!map) {
    res.status(404).json({ error: 'Mapa não encontrado.' });
    return;
  }
  res.json({ map });
});

// Serve frontend estático em produção
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

import fs from 'node:fs';
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[MindFlow API]', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const LISTEN_PORT = Number(process.env.PORT) || PORT;
ensureMasterUser();
app.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[MindFlow API] online em http://0.0.0.0:${LISTEN_PORT}`);
});
