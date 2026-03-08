import type { AuthUser } from '../types';
import { apiGetSession, apiLogin, apiLogout } from './serverApi';

export const authenticateMindflow = async (email: string, password: string): Promise<AuthUser> => {
  return apiLogin(email, password);
};

export const getMindflowSession = async (): Promise<AuthUser | null> => {
  try {
    return await apiGetSession();
  } catch {
    return null;
  }
};

export const clearMindflowAuth = async () => {
  try {
    await apiLogout();
  } catch {
    // Ignora falhas de logout para evitar travar a UI.
  }
};
