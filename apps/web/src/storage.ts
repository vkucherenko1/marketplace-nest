import type { CartItem, ProductCard, ProductVariant } from "@marketplace/contracts";

const LEGACY_CART_KEY = "marketplace-cart-v2";
const CART_KEY_PREFIX = "marketplace-cart-v3";
const FAVORITES_KEY_PREFIX = "marketplace-favorites-v1";
const RECENT_KEY = "marketplace-recent";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function cartStorageKey(ownerId: string | null): string {
  return `${CART_KEY_PREFIX}:${ownerId ?? "guest"}`;
}

export function readCart(ownerId: string | null): CartItem[] {
  const key = cartStorageKey(ownerId);
  const stored = read<CartItem[] | null>(key, null);
  if (stored) {
    return stored;
  }
  if (ownerId === null) {
    const legacy = read<CartItem[]>(LEGACY_CART_KEY, []);
    if (legacy.length > 0) {
      localStorage.setItem(key, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_CART_KEY);
    }
    return legacy;
  }
  return [];
}

export function writeCart(
  ownerId: string | null,
  items: CartItem[],
): void {
  localStorage.setItem(cartStorageKey(ownerId), JSON.stringify(items));
}

export function favoritesStorageKey(ownerId: string | null): string {
  return `${FAVORITES_KEY_PREFIX}:${ownerId ?? "guest"}`;
}

export function readFavorites(ownerId: string | null): ProductCard[] {
  return read(favoritesStorageKey(ownerId), []);
}

export function writeFavorites(
  ownerId: string | null,
  products: ProductCard[],
): void {
  localStorage.setItem(favoritesStorageKey(ownerId), JSON.stringify(products));
}

export function cartKey(
  product: ProductCard,
  variant: ProductVariant | null,
): string {
  return `${product.id}:${variant?.id ?? "default"}`;
}

export function readRecent(): ProductCard[] {
  return read(RECENT_KEY, []);
}

export function rememberProduct(product: ProductCard): ProductCard[] {
  // Сначала удаляем прежнюю позицию товара, затем ставим его в начало.
  // Так история хранит последние 20 уникальных просмотров, а не кликов.
  const recent = [
    product,
    ...readRecent().filter((item) => item.id !== product.id),
  ].slice(0, 20);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  return recent;
}
