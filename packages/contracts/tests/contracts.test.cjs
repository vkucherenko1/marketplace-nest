const assert = require("node:assert/strict");
const test = require("node:test");
const {
  PAGE_SIZES,
  PRODUCT_SORTS,
  USER_ROLES,
} = require("../dist/index.js");

test("публичные роли совпадают с RBAC-моделью маркетплейса", () => {
  assert.deepEqual(USER_ROLES, ["ADMIN", "MODERATOR", "BUYER", "SELLER"]);
});

test("API разрешает только согласованные размеры страницы", () => {
  assert.deepEqual(PAGE_SIZES, [20, 50, 100]);
  assert.equal(PAGE_SIZES.includes(25), false);
});

test("сортировки каталога остаются закрытым публичным контрактом", () => {
  assert.deepEqual(PRODUCT_SORTS, [
    "relevance",
    "sales",
    "price_asc",
    "price_desc",
    "rating",
  ]);
});
