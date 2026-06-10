import type { LoginResponse } from "@marketplace/contracts";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api } from "../../api";
import {
  clearSession,
  readSession,
  saveSession,
  type Session,
} from "./session";

interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateSessionUser: (response: LoginResponse["user"]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(readSession);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      async login(email, password) {
        setSession(saveSession(await api.login(email, password)));
      },
      logout() {
        const refreshToken = session?.refreshToken;
        clearSession();
        setSession(null);
        if (refreshToken) {
          void api.logout(refreshToken).catch(() => undefined);
        }
      },
      updateSessionUser(user) {
        if (!session) {
          return;
        }
        const next = { ...session, user };
        localStorage.setItem("marketplace-user", JSON.stringify(user));
        setSession(next);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
