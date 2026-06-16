import type { CartItem } from "@marketplace/contracts";

export function cartItemTotalMinor(item: CartItem): number {
  const unitPriceMinor = item.variant?.priceMinor ?? item.product.priceMinor;
  return unitPriceMinor * item.quantity;
}

export function cartTotalMinor(items: CartItem[]): number {
  // Все вычисления выполняются целыми центами, чтобы итог не зависел
  // от погрешностей чисел с плавающей точкой.
  return items.reduce((sum, item) => sum + cartItemTotalMinor(item), 0);
}
