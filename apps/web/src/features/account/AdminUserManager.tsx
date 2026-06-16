import type { ManagedUser, UserRole } from "@marketplace/contracts";
import { ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api";

const roleNames: Record<UserRole, string> = {
  ADMIN: "Администратор",
  MODERATOR: "Модератор",
  BUYER: "Покупатель",
  SELLER: "Продавец",
};
const managedRoles: UserRole[] = ["ADMIN", "MODERATOR", "BUYER", "SELLER"];

export function AdminUserManager(props: {
  accessToken: string;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void api
      .adminUsers(props.accessToken)
      .then((response) => setUsers(response.items))
      .catch((reason: unknown) =>
        setMessage(reason instanceof Error ? reason.message : "Ошибка загрузки"),
      );
  }, [props.accessToken]);

  function toggleRole(user: ManagedUser, role: UserRole): void {
    const hasRole = user.roles.includes(role);
    const roles = hasRole
      ? user.roles.filter((item) => item !== role)
      : [...user.roles, role];
    if (roles.length === 0) {
      setMessage("У пользователя должна остаться хотя бы одна роль");
      return;
    }
    setMessage("");
    void api
      .updateUserRoles(props.accessToken, user.id, roles)
      .then((updated) =>
        setUsers((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        ),
      )
      .catch((reason: unknown) =>
        setMessage(reason instanceof Error ? reason.message : "Ошибка сохранения"),
      );
  }

  return (
    <section className="mt-10 rounded-3xl bg-white p-7 shadow-card lg:p-10">
      <p className="eyebrow">Администрирование</p>
      <h2 className="mt-2 flex items-center gap-3 text-4xl font-semibold">
        <UsersRound className="text-lime" /> Пользователи и роли
      </h2>
      <p className="mt-3 text-sm text-ink/55">
        Назначение ролей применяется сразу. Роль продавца доступна только
        аккаунту со связанным профилем продавца.
      </p>
      <div className="mt-7 grid gap-3">
        {users.map((user) => (
          <article
            key={user.id}
            className="grid gap-4 rounded-2xl border border-ink/10 p-5 lg:grid-cols-[1fr_auto]"
          >
            <div>
              <strong className="flex items-center gap-2 text-lg">
                {user.displayName}
                {user.roles.includes("ADMIN") && (
                  <ShieldCheck className="text-lime" size={18} />
                )}
              </strong>
              <p className="mt-1 text-sm text-ink/50">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {managedRoles.map((role) => {
                const selected = user.roles.includes(role);
                const disabled =
                  (user.id === props.currentUserId && role === "ADMIN") ||
                  (role === "SELLER" && !user.sellerId);
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={disabled}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                      selected
                        ? "bg-lime text-white"
                        : "bg-cream text-ink/55 hover:text-ink"
                    } disabled:cursor-not-allowed disabled:opacity-45`}
                    onClick={() => toggleRole(user, role)}
                  >
                    {roleNames[role]}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {message && <p className="mt-4 text-sm font-medium text-red-700">{message}</p>}
    </section>
  );
}
