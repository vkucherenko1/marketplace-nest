import type { CartItem, ProductCard, ProductVariant } from "@marketplace/contracts";
import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { cartKey, readCart, writeCart } from "../../storage";
import { cartTotalMinor } from "./cartMath";
import { useAuth } from "../auth/AuthProvider";

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalMinor: number;
  add: (product: ProductCard, variant?: ProductVariant | null) => void;
  has: (product: ProductCard, variant?: ProductVariant | null) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const ownerId = session?.user.id ?? null;
  const [items, setItems] = useState<CartItem[]>(() => readCart(ownerId));

  useEffect(() => {
    // При смене аккаунта состояние полностью переключается на корзину
    // выбранного пользователя и не смешивается с гостевой или чужой.
    setItems(readCart(ownerId));
  }, [ownerId]);

  function update(next: CartItem[]): void {
    setItems(next);
    writeCart(ownerId, next);
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      totalMinor: cartTotalMinor(items),
      add(product, variant = null) {
        const key = cartKey(product, variant);
        const existing = items.find((item) => item.key === key);
        const maxQuantity = variant?.stock ?? 999;
        update(
          existing
            ? items.map((item) =>
                item.key === key
                  ? {
                      ...item,
                      quantity: Math.min(item.quantity + 1, maxQuantity),
                    }
                  : item,
              )
            : [...items, { key, product, variant, quantity: 1 }],
        );
      },
      has(product, variant = null) {
        const key = cartKey(product, variant);
        return items.some((item) => item.key === key);
      },
      setQuantity(key, quantity) {
        const current = items.find((item) => item.key === key);
        const maxQuantity = current?.variant?.stock ?? 999;
        const normalized = Math.min(
          maxQuantity,
          Math.max(1, Math.trunc(quantity) || 1),
        );
        update(
          items.map((item) =>
            item.key === key ? { ...item, quantity: normalized } : item,
          ),
        );
      },
      remove(key) {
        update(items.filter((item) => item.key !== key));
      },
    }),
    [items, ownerId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
