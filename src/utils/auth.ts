const AUTH_SESSION_STORAGE_KEY = 'mindflow_auth_session';

export const AUTH_LOGIN_EMAIL = 'redacted@example.com';
export const AUTH_LOGIN_PASSWORD = 'REMOVED_SECRET';

export const isMindflowAuthenticated = () => {
  if (typeof window === 'undefined') return false;

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
