import type { Category } from "@marketplace/contracts";
import { Menu, ShoppingBag, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../features/auth/AuthProvider";
import { useCart } from "../features/cart/CartProvider";
import { IconButton } from "../shared/IconButton";

export function Header() {
  const { session } = useAuth();
  const cart = useCart();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const orderedCategories = flattenCategoryTree(categories);

  useEffect(() => {
    const controller = new AbortController();
    void api.categories(controller.signal).then(setCategories).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-5 py-4 lg:px-10">
          <button
            className="flex cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => setIsCatalogOpen(true)}
          >
            <Menu size={18} /> Каталог
          </button>
          <Link className="mr-auto flex items-center gap-3" to="/">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-lime">
              <Sparkles size={19} />
            </span>
            <span>
              <strong className="block text-lg leading-none">market pulse</strong>
              <small className="text-xs text-ink/55">выбрано с вниманием</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
            <NavLink to="/catalog">Все товары</NavLink>
          </nav>
          <Link
            className="flex items-center gap-2 rounded-full border border-ink/15 px-3 py-2 text-sm font-semibold"
            to={session ? "/account" : "/login"}
          >
            {session?.user.avatarUrl ? (
              <img
                className="h-6 w-6 rounded-full object-cover"
                src={session.user.avatarUrl}
                alt=""
              />
            ) : (
              <UserRound size={18} />
            )}
            <span className="hidden max-w-36 truncate sm:inline">
              {session?.user.displayName ?? "Войти"}
            </span>
          </Link>
          <Link
            className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-white"
            aria-label="Корзина"
            to="/cart"
          >
            <ShoppingBag size={19} />
            {cart.count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </Link>
        </div>
      </header>

      {isCatalogOpen && (
        <aside className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto bg-cream p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-semibold">Каталог</h2>
              <IconButton aria-label="Закрыть каталог" onClick={() => setIsCatalogOpen(false)}>
                <X size={19} />
              </IconButton>
            </div>
            <nav className="mt-8 grid gap-3">
              <Link
                className="rounded-2xl bg-ink p-5 text-xl font-semibold text-white"
                to="/catalog"
                onClick={() => setIsCatalogOpen(false)}
              >
                Все товары
              </Link>
              {orderedCategories.map((category) => (
                <Link
                  key={category.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-5 text-lg font-semibold"
                  style={{ marginLeft: Math.min(category.depth - 1, 4) * 14 }}
                  to={`/category/${category.slug}`}
                  onClick={() => setIsCatalogOpen(false)}
                >
                  {category.name}
                  <span className="text-sm text-ink/40">{category.productCount}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}

function flattenCategoryTree(categories: Category[]): Category[] {
  const children = new Map<string | null, Category[]>();
  categories.forEach((category) => {
    const group = children.get(category.parentId) ?? [];
    group.push(category);
    children.set(category.parentId, group);
  });
  children.forEach((group) =>
    group.sort((left, right) => left.name.localeCompare(right.name, "ru")),
  );
  const result: Category[] = [];
  function visit(parentId: string | null): void {
    for (const category of children.get(parentId) ?? []) {
      result.push(category);
      visit(category.id);
    }
  }
  visit(null);
  return result;
}
