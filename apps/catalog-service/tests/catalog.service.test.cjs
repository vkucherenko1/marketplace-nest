const assert = require("node:assert/strict");
const test = require("node:test");
const { CatalogService } = require("../dist/catalog/catalog.service.js");

const buyer = {
  sub: "buyer-1",
  roles: ["BUYER"],
  sellerId: null,
  type: "access",
};
const seller = {
  sub: "seller-user-1",
  roles: ["SELLER"],
  sellerId: "seller-1",
  type: "access",
};
const moderator = {
  sub: "moderator-1",
  roles: ["MODERATOR"],
  sellerId: null,
  type: "access",
};

test("покупатель не может создавать товар", async () => {
  const service = new CatalogService({});
  await assert.rejects(
    service.create(buyer, {}),
    (error) => error.getStatus() === 403,
  );
});

test("создание товара передаёт в репозиторий sellerId владельца", async () => {
  let receivedSellerId;
  const service = new CatalogService({
    createProduct: async (sellerId) => {
      receivedSellerId = sellerId;
      return { id: "product-1", slug: "product-1" };
    },
  });

  const result = await service.create(seller, {
    name: "Тестовый товар",
    description: "Достаточно длинное описание тестового товара",
    categoryId: "category-1",
    priceMinor: 10000,
    imageUrl: "https://example.com/product.jpg",
    stock: 5,
  });

  assert.equal(receivedSellerId, "seller-1");
  assert.equal(result.slug, "product-1");
});

test("модератор может создать корневую категорию", async () => {
  let created = null;
  const repository = {
    listCategories: async () => [],
    categorySlugExists: async () => false,
    createCategory: async (input) => {
      created = input;
      return { id: "category-1", ...input, depth: 1, productCount: 0 };
    },
  };
  const service = new CatalogService(repository);

  await service.createCategory(moderator, {
    name: "Электроника",
    slug: "electronics",
    parentId: null,
  });

  assert.equal(created.slug, "electronics");
});

test("категория не может превышать глубину пять уровней", async () => {
  const repository = {
    listCategories: async () => [
      {
        id: "parent",
        name: "Уровень 5",
        slug: "level-5",
        parentId: "level-4",
        depth: 5,
        productCount: 0,
      },
    ],
    categorySlugExists: async () => false,
    categoryDepth: async () => 5,
  };
  const service = new CatalogService(repository);

  await assert.rejects(
    service.createCategory(moderator, {
      name: "Лишний уровень",
      slug: "level-6",
      parentId: "parent",
    }),
    (error) => error.getStatus() === 400,
  );
});

test("продавец не может изменить чужой товар", async () => {
  const service = new CatalogService({
    setStatus: async () => false,
  });

  await assert.rejects(
    service.changeStatus(seller, "foreign-product", "HIDDEN"),
    (error) => error.getStatus() === 404,
  );
});

test("несуществующая карточка товара возвращает 404", async () => {
  const service = new CatalogService({
    findProductBySlug: async () => null,
  });

  await assert.rejects(
    service.product("missing"),
    (error) => error.getStatus() === 404,
  );
});

test("отзывы передают пагинацию, рейтинг и сортировку в репозиторий", async () => {
  let receivedQuery = null;
  const service = new CatalogService({
    listProductReviews: async (_slug, query) => {
      receivedQuery = query;
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
      };
    },
  });

  await service.reviews("product", {
    page: 2,
    pageSize: 6,
    rating: 5,
    sort: "oldest",
  });

  assert.deepEqual(receivedQuery, {
    page: 2,
    pageSize: 6,
    rating: 5,
    sort: "oldest",
  });
});
