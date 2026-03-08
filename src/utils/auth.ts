const AUTH_SESSION_STORAGE_KEY = 'mindflow_auth_session';

const AUTH_LOGIN_EMAIL = String(import.meta.env.VITE_AUTH_EMAIL || '')
  .trim()
  .toLowerCase();
const AUTH_LOGIN_PASSWORD = String(import.meta.env.VITE_AUTH_PASSWORD || '').trim();

export const isMindflowAuthConfigured = () => Boolean(AUTH_LOGIN_EMAIL && AUTH_LOGIN_PASSWORD);

export const isMindflowAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  if (!isMindflowAuthConfigured()) return false;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.email === AUTH_LOGIN_EMAIL;
  } catch {
    return false;
  }
};

export const authenticateMindflow = (email: string, password: string) => {
  if (typeof window === 'undefined') return false;
  if (!isMindflowAuthConfigured()) return false;

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== AUTH_LOGIN_EMAIL || password !== AUTH_LOGIN_PASSWORD) {
    return false;
  }

  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      email: AUTH_LOGIN_EMAIL,
      authenticatedAt: Date.now(),
    }),
  );

  return true;
};

export const clearMindflowAuth = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
};
