import assert from "node:assert/strict";
import test from "node:test";
import {
  cartKey,
  cartStorageKey,
  readCart,
  readRecent,
  rememberProduct,
  writeCart,
} from "../src/storage.ts";
import { clearSession, readSession, saveSession } from "../src/features/auth/session.ts";
import { cartItemTotalMinor, cartTotalMinor } from "../src/features/cart/cartMath.ts";
import { buildCategoryTree } from "../src/features/catalog/categoryTree.ts";
import { money } from "../src/shared/format.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage });

function product(id: string) {
  return {
    id,
    slug: `product-${id}`,
    name: `Товар ${id}`,
    description: "Описание",
    priceMinor: 10000,
    imageUrl: "https://example.com/product.jpg",
    rating: 4.8,
    reviewCount: 10,
    inStock: true,
    category: { id: "category-1", name: "Категория", slug: "category" },
    seller: { id: "seller-1", name: "Продавец", rating: 4.9, reviewCount: 50 },
  };
}

test.beforeEach(() => storage.clear());

test("корзина сохраняется и восстанавливается без потери количества", () => {
  const item = { key: "1:default", product: product("1"), variant: null, quantity: 3 };
  writeCart("buyer-1", [item]);
  assert.deepEqual(readCart("buyer-1"), [item]);
});

test("ключ корзины различает варианты одного товара", () => {
  const item = product("1");
  assert.equal(cartKey(item, null), "1:default");
  assert.equal(
    cartKey(item, {
      id: "variant-xl",
      slug: "xl",
      name: "Размер",
      value: "XL",
      priceMinor: 12000,
      imageUrl: "https://example.com/xl.jpg",
      stock: 2,
    }),
    "1:variant-xl",
  );
});

test("история хранит 20 уникальных последних товаров", () => {
  for (let index = 1; index <= 22; index += 1) {
    rememberProduct(product(String(index)));
  }
  rememberProduct(product("10"));

  const recent = readRecent();
  assert.equal(recent.length, 20);
  assert.equal(recent[0]?.id, "10");
  assert.equal(new Set(recent.map((item) => item.id)).size, 20);
});

test("сессия сохраняется, читается и полностью очищается", () => {
  saveSession({
    accessToken: "access",
    refreshToken: "refresh",
    expiresIn: 900,
    user: {
      id: "user-1",
      email: "buyer@market.local",
      displayName: "Анна Покупатель",
      roles: ["BUYER"],
      avatarUrl: null,
    },
  });

  assert.equal(readSession()?.user.email, "buyer@market.local");
  clearSession();
  assert.equal(readSession(), null);
});

test("три товара по 117 долларов дают итог 351 доллар", () => {
  const item = {
    key: "1:default",
    product: { ...product("1"), priceMinor: 11700 },
    variant: null,
    quantity: 3,
  };
  assert.equal(cartItemTotalMinor(item), 35100);
  assert.equal(cartTotalMinor([item]), 35100);
});

test("денежный формат не скрывает центы и не создаёт ложное округление", () => {
  const formatted = money.format(116.5);
  assert.match(formatted, /116[,\s]50/);
});

test("дерево каталога изначально содержит только корневые узлы", () => {
  const tree = buildCategoryTree([
    {
      id: "root",
      name: "Электроника",
      slug: "electronics",
      parentId: null,
      depth: 1,
      productCount: 100,
    },
    {
      id: "child",
      name: "Ноутбуки",
      slug: "laptops",
      parentId: "root",
      depth: 2,
      productCount: 50,
    },
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0]?.name, "Электроника");
  assert.equal(tree[0]?.children[0]?.name, "Ноутбуки");
});

test("корзины разных аккаунтов и гостя изолированы", () => {
  const buyerItem = {
    key: "buyer:default",
    product: product("buyer"),
    variant: null,
    quantity: 1,
  };
  const sellerItem = {
    key: "seller:default",
    product: product("seller"),
    variant: null,
    quantity: 2,
  };

  writeCart("buyer-1", [buyerItem]);
  writeCart("seller-1", [sellerItem]);
  writeCart(null, []);

  assert.deepEqual(readCart("buyer-1"), [buyerItem]);
  assert.deepEqual(readCart("seller-1"), [sellerItem]);
  assert.deepEqual(readCart(null), []);
  assert.notEqual(cartStorageKey("buyer-1"), cartStorageKey("seller-1"));
});
