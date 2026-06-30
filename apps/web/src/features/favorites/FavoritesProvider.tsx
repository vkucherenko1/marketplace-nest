import type { ProductCard } from "@marketplace/contracts";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { readFavorites, writeFavorites } from "../../storage";
import { useAuth } from "../auth/AuthProvider";

interface FavoritesContextValue {
  items: ProductCard[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (product: ProductCard) => void;
  remove: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const ownerId = session?.user.id ?? null;
  const [items, setItems] = useState<ProductCard[]>(() => readFavorites(ownerId));

  useEffect(() => {
    setItems(readFavorites(ownerId));
  }, [ownerId]);

  function update(next: ProductCard[]): void {
    setItems(next);
    writeFavorites(ownerId, next);
  }

  const value = useMemo<FavoritesContextValue>(
    () => ({
      items,
      count: items.length,
      has(productId) {
        return items.some((item) => item.id === productId);
      },
      toggle(product) {
        // Избранное хранится отдельно для каждого аккаунта, как корзина.
        // Повторное нажатие убирает товар без перехода в карточку.
        update(
          items.some((item) => item.id === product.id)
            ? items.filter((item) => item.id !== product.id)
            : [product, ...items],
        );
      },
      remove(productId) {
        update(items.filter((item) => item.id !== productId));
      },
    }),
    [items, ownerId],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }
  return context;
}
