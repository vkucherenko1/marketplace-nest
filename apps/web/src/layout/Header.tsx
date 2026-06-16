import type { Category } from "@marketplace/contracts";
import {
  Heart,
  ChevronDown,
  ChevronRight,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../features/auth/AuthProvider";
import { useCart } from "../features/cart/CartProvider";
import { IconButton } from "../shared/IconButton";
import {
  buildCategoryTree,
  type CategoryTreeNode,
} from "../features/catalog/categoryTree";

export function Header() {
  const { session } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const categoryTree = buildCategoryTree(categories);

  useEffect(() => {
    const controller = new AbortController();
    void api.categories(controller.signal).then(setCategories).catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink/8 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1500px] px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-ink/55">
            <MapPin size={14} className="text-lime" />
            <span>Кишинёв</span>
            <span className="ml-auto hidden sm:inline">
              Доставка от 1 дня · безопасная оплата
            </span>
          </div>

          {/* Каталог и поиск объединены в главную рабочую строку шапки. */}
          <div className="mt-3 flex items-center gap-3">
            <Link
              className="shrink-0 text-2xl font-extrabold tracking-[-.06em] text-lime"
              to="/"
            >
              MARKET<span className="text-coral">.</span>
            </Link>
            <button
              className="hidden cursor-pointer items-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 sm:flex"
              onClick={() => setIsCatalogOpen(true)}
            >
              <Menu size={18} /> Каталог
            </button>
            <form
              className="flex min-w-0 flex-1 rounded-xl border-2 border-lime bg-white p-0.5"
              onSubmit={(event) => {
                event.preventDefault();
                const query = search.trim();
                navigate(
                  query
                    ? `/catalog?search=${encodeURIComponent(query)}`
                    : "/catalog",
                );
              }}
            >
              <input
                className="min-w-0 flex-1 rounded-l-lg bg-transparent px-4 text-sm outline-none"
                placeholder="Искать товары и категории"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                className="grid h-10 w-12 place-items-center rounded-lg bg-lime text-white"
                aria-label="Найти"
              >
                <Search size={20} />
              </button>
            </form>
            <Link className="header-action hidden md:flex" to="/catalog">
              <Heart size={21} />
              <span className="hidden lg:inline">Избранное</span>
            </Link>
            <Link
              className="header-action"
              to={session ? "/account" : "/login"}
            >
              {session?.user.avatarUrl ? (
                <img
                  className="h-6 w-6 rounded-full object-cover"
                  src={session.user.avatarUrl}
                  alt=""
                />
              ) : (
                <UserRound size={21} />
              )}
              <span className="hidden max-w-24 truncate lg:inline">
                {session?.user.displayName ?? "Войти"}
              </span>
            </Link>
            <Link
              className="header-action relative"
              aria-label="Корзина"
              to="/cart"
            >
              <ShoppingCart size={21} />
              <span className="hidden lg:inline">Корзина</span>
              {cart.count > 0 && (
                <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                  {cart.count}
                </span>
              )}
            </Link>
          </div>
          <button
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-lime sm:hidden"
            onClick={() => setIsCatalogOpen(true)}
          >
            <Menu size={17} /> Открыть каталог
          </button>
        </div>
      </header>

      {isCatalogOpen && (
        <aside className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Каталог</h2>
              <IconButton
                aria-label="Закрыть каталог"
                onClick={() => setIsCatalogOpen(false)}
              >
                <X size={19} />
              </IconButton>
            </div>
            <nav className="mt-8 grid gap-1">
              <Link
                className="rounded-xl bg-lime p-4 text-lg font-semibold text-white"
                to="/catalog"
                onClick={() => setIsCatalogOpen(false)}
              >
                Все товары
              </Link>
              {categoryTree.map((category) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  expanded={expandedCategories}
                  onToggle={(id) =>
                    setExpandedCategories((current) => {
                      const next = new Set(current);
                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }
                      return next;
                    })
                  }
                  onNavigate={() => setIsCatalogOpen(false)}
                />
              ))}
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}

function CategoryTreeItem(props: {
  category: CategoryTreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}) {
  const hasChildren = props.category.children.length > 0;
  const isExpanded = props.expanded.has(props.category.id);

  return (
    <div>
      <div
        className="flex items-center rounded-xl transition hover:bg-cream"
        style={{ marginLeft: Math.min(props.category.depth - 1, 4) * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink/45 hover:text-lime"
            aria-label={`${isExpanded ? "Свернуть" : "Раскрыть"} ${props.category.name}`}
            aria-expanded={isExpanded}
            onClick={() => props.onToggle(props.category.id)}
          >
            {isExpanded ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        ) : (
          <span className="w-10 shrink-0" />
        )}
        <Link
          className="flex min-w-0 flex-1 items-center justify-between py-3 pr-4 text-base font-semibold hover:text-lime"
          to={`/category/${props.category.slug}`}
          onClick={props.onNavigate}
        >
          <span className="truncate">{props.category.name}</span>
          <span className="ml-3 text-xs font-normal text-ink/40">
            {props.category.productCount}
          </span>
        </Link>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {props.category.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              expanded={props.expanded}
              onToggle={props.onToggle}
              onNavigate={props.onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
