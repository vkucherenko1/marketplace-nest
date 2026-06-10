import type { LoginResponse, UserSummary } from "@marketplace/contracts";

const ACCESS_TOKEN_KEY = "marketplace-access";
const REFRESH_TOKEN_KEY = "marketplace-refresh";
const USER_KEY = "marketplace-user";

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export function readSession(): Session | null {
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (!accessToken || !refreshToken || !user) {
      return null;
    }
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(user) as UserSummary,
    };
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(response: LoginResponse): Session {
  // Токены и профиль сохраняются вместе, чтобы после перезагрузки интерфейс
  // мог восстановить авторизованного пользователя без повторного входа.
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  };
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
