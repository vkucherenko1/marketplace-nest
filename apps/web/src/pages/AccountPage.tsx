import type {
  UpdateUserProfile,
  UserProfile,
} from "@marketplace/contracts";
import { LogOut, Save, UserRound } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../features/auth/AuthProvider";
import { CategoryManager } from "../features/moderation/CategoryManager";
import { RoleDashboard } from "../features/account/RoleDashboard";
import { AdminUserManager } from "../features/account/AdminUserManager";
import { SellerDashboard } from "../features/seller/SellerDashboard";
import { DatePicker } from "../shared/DatePicker";
import { SelectField } from "../shared/SelectField";

const emptyProfile: UpdateUserProfile = {
  firstName: "",
  lastName: "",
  middleName: null,
  birthDate: null,
  phone: null,
  gender: null,
  city: null,
  address: null,
  avatarUrl: null,
};

export function AccountPage() {
  const { session, logout, updateSessionUser } = useAuth();
  const [profile, setProfile] = useState<UpdateUserProfile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<UserProfile["roles"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }
    void api
      .profile(session.accessToken)
      .then((data) => {
        setProfile(toForm(data));
        setEmail(data.email);
        setRoles(data.roles);
      })
      .catch((reason: unknown) =>
        setMessage(reason instanceof Error ? reason.message : "Ошибка загрузки"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) {
    return <Navigate replace state={{ from: "/account" }} to="/login" />;
  }
  if (loading) {
    return <AccountShell title="Загружаем профиль..." />;
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-3xl bg-white p-7 shadow-card">
          {profile.avatarUrl ? (
            <img
              className="h-32 w-32 rounded-full object-cover ring-4 ring-lime/15"
              src={profile.avatarUrl}
              alt="Аватар пользователя"
            />
          ) : (
            <div className="grid h-32 w-32 place-items-center rounded-full bg-lime/10 text-lime">
              <UserRound size={48} />
            </div>
          )}
          <h1 className="mt-6 text-3xl font-semibold">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="mt-2 text-sm text-ink/55">{email}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-lime/10 px-3 py-1 text-xs text-lime"
              >
                {role}
              </span>
            ))}
          </div>
          <button
            className="mt-8 flex items-center gap-2 text-sm font-semibold text-ink/55 hover:text-lime"
            onClick={logout}
          >
            <LogOut size={17} /> Выйти из аккаунта
          </button>
        </aside>

        <form
          className="rounded-3xl bg-white p-7 shadow-card lg:p-10"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setMessage("");
            void api
              .updateProfile(session.accessToken, profile)
              .then((updated) => {
                setProfile(toForm(updated));
                updateSessionUser(updated);
                setMessage("Профиль сохранён");
              })
              .catch((reason: unknown) =>
                setMessage(
                  reason instanceof Error ? reason.message : "Ошибка сохранения",
                ),
              )
              .finally(() => setSaving(false));
          }}
        >
          <p className="eyebrow">Личный кабинет</p>
          <h2 className="mt-2 text-4xl font-semibold">Персональные данные</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
            Данные используются для заказов, доставки и связи с поддержкой.
            Email меняется через отдельную подтверждаемую процедуру.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Field label="Имя">
              <input
                required
                value={profile.firstName}
                onChange={(event) =>
                  setProfile({ ...profile, firstName: event.target.value })
                }
              />
            </Field>
            <Field label="Фамилия">
              <input
                required
                value={profile.lastName}
                onChange={(event) =>
                  setProfile({ ...profile, lastName: event.target.value })
                }
              />
            </Field>
            <Field label="Отчество">
              <input
                value={profile.middleName ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, middleName: event.target.value || null })
                }
              />
            </Field>
            <Field label="Дата рождения">
              <DatePicker
                ariaLabel="Дата рождения"
                value={profile.birthDate ?? ""}
                onChange={(value) =>
                  setProfile({ ...profile, birthDate: value })
                }
              />
            </Field>
            <Field label="Телефон">
              <input
                placeholder="+373..."
                value={profile.phone ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, phone: event.target.value || null })
                }
              />
            </Field>
            <Field label="Пол">
              <SelectField
                ariaLabel="Пол"
                value={profile.gender ?? ""}
                options={[
                  { value: "", label: "Не указан" },
                  { value: "FEMALE", label: "Женский" },
                  { value: "MALE", label: "Мужской" },
                  { value: "OTHER", label: "Другой" },
                ]}
                onChange={(value) =>
                  setProfile({
                    ...profile,
                    gender: (value as UpdateUserProfile["gender"]) || null,
                  })
                }
              />
            </Field>
            <Field label="Город">
              <input
                value={profile.city ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, city: event.target.value || null })
                }
              />
            </Field>
            <Field label="Email">
              <input disabled value={email} />
            </Field>
            <Field className="md:col-span-2" label="Адрес доставки">
              <input
                value={profile.address ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, address: event.target.value || null })
                }
              />
            </Field>
            <Field className="md:col-span-2" label="URL аватара">
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={profile.avatarUrl ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, avatarUrl: event.target.value || null })
                }
              />
            </Field>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              className="flex items-center gap-2 rounded-xl bg-lime px-6 py-3.5 font-bold text-white"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Сохраняем..." : "Сохранить изменения"}
            </button>
            {message && <p className="text-sm font-medium">{message}</p>}
          </div>
        </form>
      </div>
      {roles.map((role) => (
        <RoleDashboard
          key={role}
          role={role}
          accessToken={session.accessToken}
        />
      ))}
      {roles.includes("SELLER") && (
        <SellerDashboard accessToken={session.accessToken} />
      )}
      {roles.some((role) => role === "MODERATOR" || role === "ADMIN") && (
        <CategoryManager accessToken={session.accessToken} />
      )}
      {roles.includes("ADMIN") && (
        <AdminUserManager
          accessToken={session.accessToken}
          currentUserId={session.user.id}
        />
      )}
    </section>
  );
}

function Field(props: {
  label: string;
  children: ReactElement;
  className?: string;
}) {
  return (
    <div className={`block text-sm font-medium ${props.className ?? ""}`}>
      <span>{props.label}</span>
      <span className="mt-2 block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-ink/15 [&>input]:px-4 [&>input]:py-3">
        {props.children}
      </span>
    </div>
  );
}

function AccountShell({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-[1500px] px-5 py-24 text-center lg:px-10">
      <h1 className="text-4xl font-semibold">{title}</h1>
    </section>
  );
}

function toForm(profile: UserProfile): UpdateUserProfile {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    middleName: profile.middleName,
    birthDate: profile.birthDate,
    phone: profile.phone,
    gender: profile.gender,
    city: profile.city,
    address: profile.address,
    avatarUrl: profile.avatarUrl,
  };
}
