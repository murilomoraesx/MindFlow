import type { AuthUser, MapData, ProjectFolder, RecentMap } from '../types';

type ClientSummary = AuthUser & {
  projectCount: number;
  mapCount: number;
};

const request = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = 'Erro inesperado.';
    try {
      const data = await response.json();
      message = String(data?.error || message);
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const apiLogin = async (email: string, password: string) => {
  const data = await request<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
};

export const apiLogout = async () => {
  await request('/api/auth/logout', {
    method: 'POST',
  });
};

export const apiGetSession = async () => {
  const data = await request<{ user: AuthUser }>('/api/auth/session');
  return data.user;
};

export const apiListProjects = async () => {
  const data = await request<{ projects: (ProjectFolder & { mapCount: number })[] }>('/api/projects');
  return data.projects;
};

export const apiCreateProject = async (payload: { name: string; description?: string }) => {
  const data = await request<{ project: ProjectFolder & { mapCount: number } }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.project;
};

export const apiUpdateProject = async (id: string, payload: { name: string; description?: string }) => {
  const data = await request<{ project: ProjectFolder & { mapCount: number } }>(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.project;
};

export const apiDeleteProject = async (id: string) => {
  await request(`/api/projects/${id}`, { method: 'DELETE' });
};

export const apiListMaps = async () => {
  const data = await request<{ maps: RecentMap[] }>('/api/maps');
  return data.maps;
};

export const apiGetMap = async (id: string) => {
  const data = await request<{ map: MapData }>(`/api/maps/${id}`);
  return data.map;
};

export const apiCreateMap = async (map: MapData) => {
  const data = await request<{ map: MapData }>('/api/maps', {
    method: 'POST',
    body: JSON.stringify({ map }),
  });
  return data.map;
};

export const apiSaveMap = async (map: MapData) => {
  const data = await request<{ map: MapData }>(`/api/maps/${map.id}`, {
    method: 'PUT',
    body: JSON.stringify({ map }),
  });
  return data.map;
};

export const apiDeleteMap = async (id: string) => {
  await request(`/api/maps/${id}`, { method: 'DELETE' });
};

export const apiListClients = async () => {
  const data = await request<{ clients: ClientSummary[] }>('/api/admin/clients');
  return data.clients;
};

export const apiCreateClient = async (payload: { name: string; email: string; password: string; role?: 'client' | 'collaborator' }) => {
  const data = await request<{ client: AuthUser }>('/api/admin/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.client;
};

export const apiRevokeClient = async (id: string) => {
  const data = await request<{ client: AuthUser }>(`/api/admin/clients/${id}/revoke`, { method: 'POST' });
  return data.client;
};

export const apiRestoreClient = async (id: string) => {
  const data = await request<{ client: AuthUser }>(`/api/admin/clients/${id}/restore`, { method: 'POST' });
  return data.client;
};

export const apiListClientMaps = async (id: string) => {
  const data = await request<{ maps: RecentMap[] }>(`/api/admin/clients/${id}/maps`);
  return data.maps;
};

export const apiGetAdminMap = async (id: string) => {
  const data = await request<{ map: MapData }>(`/api/admin/maps/${id}`);
  return data.map;
};
