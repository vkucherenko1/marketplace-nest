import type { PlatformOverview, UserRole } from "@marketplace/contracts";
import {
  Boxes,
  FolderTree,
  MessageSquareText,
  PackageCheck,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

export function RoleDashboard(props: {
  role: UserRole;
  accessToken: string;
}) {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);

  useEffect(() => {
    if (props.role === "ADMIN" || props.role === "MODERATOR") {
      void api.moderationOverview(props.accessToken).then(setOverview);
    }
  }, [props.accessToken, props.role]);

  if (props.role === "BUYER") {
    return (
      <section className="mt-10 rounded-3xl bg-white p-7 shadow-card lg:p-10">
        <p className="eyebrow">Кабинет покупателя</p>
        <h2 className="mt-2 text-4xl font-semibold">Покупки и доставка</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <ActionCard
            icon={<ShoppingCart />}
            title="Моя корзина"
            text="Товары сохранены отдельно для этого аккаунта"
            to="/cart"
          />
          <ActionCard
            icon={<PackageCheck />}
            title="История заказов"
            text="Заказы появятся после подключения checkout-сервиса"
          />
          <ActionCard
            icon={<Boxes />}
            title="Недавно смотрели"
            text="Вернуться к просмотренным товарам"
            to="/#recent"
          />
        </div>
      </section>
    );
  }

  // Для продавца ниже AccountPage подключает отдельный SellerDashboard.
  // Явная ветка не позволяет ошибочно принять SELLER за MODERATOR.
  if (props.role === "SELLER") {
    return null;
  }

  const isAdmin = props.role === "ADMIN";
  return (
    <section className="mt-10 rounded-3xl bg-white p-7 shadow-card lg:p-10">
      <p className="eyebrow">
        {isAdmin ? "Панель администратора" : "Рабочее место модератора"}
      </p>
      <h2 className="mt-2 text-4xl font-semibold">
        {isAdmin ? "Управление платформой" : "Контроль каталога"}
      </h2>
      <p className="mt-3 text-sm text-ink/55">
        {isAdmin
          ? "Администратор видит сводку платформы и имеет права управления структурой каталога."
          : "Модератор управляет категориями и контролирует скрытые карточки товаров."}
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<FolderTree />} label="Категории" value={overview?.categories} />
        <Metric icon={<Boxes />} label="Активные товары" value={overview?.activeProducts} />
        <Metric icon={<PackageCheck />} label="Скрытые товары" value={overview?.hiddenProducts} />
        <Metric icon={<Store />} label="Продавцы" value={overview?.sellers} />
        <Metric icon={<MessageSquareText />} label="Отзывы" value={overview?.reviews} />
      </div>
    </section>
  );
}

function Metric(props: {
  icon: ReactNode;
  label: string;
  value: number | undefined;
}) {
  return (
    <article className="rounded-2xl bg-cream p-5">
      <span className="text-lime">{props.icon}</span>
      <strong className="mt-5 block text-3xl">{props.value ?? "—"}</strong>
      <span className="mt-1 block text-xs text-ink/50">{props.label}</span>
    </article>
  );
}

function ActionCard(props: {
  icon: ReactNode;
  title: string;
  text: string;
  to?: string;
}) {
  const content = (
    <>
      <span className="text-lime">{props.icon}</span>
      <strong className="mt-5 block text-xl">{props.title}</strong>
      <span className="mt-2 block text-sm leading-6 text-ink/50">{props.text}</span>
    </>
  );
  return props.to ? (
    <Link className="rounded-2xl bg-cream p-5 transition hover:ring-2 hover:ring-lime/20" to={props.to}>
      {content}
    </Link>
  ) : (
    <article className="rounded-2xl bg-cream p-5">{content}</article>
  );
}
