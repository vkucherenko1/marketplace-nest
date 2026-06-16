import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("buyer@market.local");
  const [password, setPassword] = useState("Marketplace123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate replace to="/account" />;
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-[1500px] place-items-center px-5 py-12 lg:px-10">
      <form
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-card lg:p-12"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          setError("");
          void login(email, password)
            .then(() => {
              const destination =
                (location.state as { from?: string } | null)?.from ?? "/account";
              navigate(destination, { replace: true });
            })
            .catch((reason: unknown) =>
              setError(reason instanceof Error ? reason.message : "Ошибка входа"),
            )
            .finally(() => setLoading(false));
        }}
      >
        <p className="eyebrow">Авторизация</p>
        <h1 className="mt-2 text-4xl font-bold">Войти в аккаунт</h1>
        <label className="mt-8 block text-sm font-medium">
          Email
          <input
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/50 px-4 py-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Пароль
          <input
            type="password"
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream/50 px-4 py-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <button
          className="mt-7 w-full rounded-xl bg-lime py-4 font-bold text-white"
          disabled={loading}
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </section>
  );
}
