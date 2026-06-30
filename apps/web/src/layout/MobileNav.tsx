import { Heart, Home, Menu, ShoppingCart, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { useCart } from "../features/cart/CartProvider";
import { useFavorites } from "../features/favorites/FavoritesProvider";

const items = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/catalog", label: "Каталог", icon: Menu },
  { to: "/favorites", label: "Избранное", icon: Heart },
  { to: "/cart", label: "Корзина", icon: ShoppingCart },
];

export function MobileNav() {
  const location = useLocation();
  const cart = useCart();
  const favorites = useFavorites();
  const { session } = useAuth();
  const accountPath = session ? "/account" : "/login";

  return (
    <nav
      className="mobile-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-2 pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
      aria-label="Мобильная навигация"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname === item.to;
          return (
            <Link
              key={item.label}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                isActive ? "bg-lime/10 text-lime" : "text-ink/55"
              }`}
              to={item.to}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {item.to === "/cart" && cart.count > 0 && (
                <span className="absolute right-4 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] text-white">
                  {cart.count}
                </span>
              )}
              {item.to === "/favorites" && favorites.count > 0 && (
                <span className="absolute right-4 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] text-white">
                  {favorites.count}
                </span>
              )}
            </Link>
          );
        })}
        <Link
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
            location.pathname === accountPath ? "bg-lime/10 text-lime" : "text-ink/55"
          }`}
          to={accountPath}
        >
          <UserRound size={20} />
          <span>Кабинет</span>
        </Link>
      </div>
    </nav>
  );
}
