import type { CartItem, ProductCard, ProductVariant } from "@marketplace/contracts";

const CART_KEY = "marketplace-cart-v2";
const RECENT_KEY = "marketplace-recent";

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readCart(): CartItem[] {
  return read(CART_KEY, []);
}

export function writeCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
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
