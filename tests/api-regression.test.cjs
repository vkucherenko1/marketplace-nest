const assert = require("node:assert/strict");
const test = require("node:test");

const apiUrl = process.env.REGRESSION_API_URL ?? "http://localhost:8080/api/v1";
const webUrl = process.env.REGRESSION_WEB_URL ?? "http://localhost:3000";
const password = "Marketplace123!";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}/${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  return { response, body };
}

async function login(email) {
  const { response, body } = await request("auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(response.status, 200);
  assert.ok(body.accessToken);
  assert.ok(body.refreshToken);
  return body;
}

test("инфраструктурные HTTP endpoints доступны", async () => {
  const checks = [
    [webUrl, 200],
    ["http://localhost:8222/varz", 200],
    ["http://localhost:7700/health", 200],
    ["http://localhost:9000/minio/health/live", 200],
  ];
  for (const [url, status] of checks) {
    const response = await fetch(url);
    assert.equal(response.status, status, url);
  }
});

test("health gateway отвечает корректным контрактом", async () => {
  const { response, body } = await request("health");
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: "ok", service: "api-gateway" });
});

test("авторизация, профиль, refresh и logout работают вместе", async () => {
  const invalid = await request("auth/login", {
    method: "POST",
    body: { email: "buyer@market.local", password: "wrong-password" },
  });
  assert.equal(invalid.response.status, 401);

  const session = await login("buyer@market.local");
  const profile = await request("auth/profile", { token: session.accessToken });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.email, "buyer@market.local");

  const refreshed = await request("auth/refresh", {
    method: "POST",
    body: { refreshToken: session.refreshToken },
  });
  assert.equal(refreshed.response.status, 200);
  assert.ok(refreshed.body.accessToken);

  const logout = await request("auth/logout", {
    method: "POST",
    body: { refreshToken: refreshed.body.refreshToken },
  });
  assert.equal(logout.response.status, 204);
});

test("категории, поиск, сортировки и пагинация соблюдают контракт", async () => {
  const categories = await request("categories");
  assert.equal(categories.response.status, 200);
  assert.ok(categories.body.length >= 90);
  assert.ok(categories.body.every((category) => category.depth <= 5));

  const firstPage = await request("products?page=1&pageSize=20");
  assert.equal(firstPage.response.status, 200);
  assert.equal(firstPage.body.page, 1);
  assert.equal(firstPage.body.pageSize, 20);
  assert.equal(firstPage.body.items.length, 20);

  const secondPage = await request("products?page=2&pageSize=50");
  assert.equal(secondPage.response.status, 200);
  assert.equal(secondPage.body.page, 2);
  assert.equal(secondPage.body.pageSize, 50);

  const ascending = await request("products?pageSize=20&sort=price_asc");
  const prices = ascending.body.items.map((item) => item.priceMinor);
  assert.deepEqual(prices, [...prices].sort((left, right) => left - right));

  const search = await request(
    `products?pageSize=20&search=${encodeURIComponent("AeroBook")}`,
  );
  assert.equal(search.response.status, 200);
  assert.ok(search.body.items.length > 0);
  assert.ok(
    search.body.items.every((item) =>
      item.name.toLocaleLowerCase("ru").includes("aerobook"),
    ),
  );
});

test("карточка товара содержит варианты и продавца", async () => {
  const list = await request(
    `products?pageSize=20&search=${encodeURIComponent("AeroBook")}`,
  );
  const product = await request(`products/${list.body.items[0].slug}`);
  assert.equal(product.response.status, 200);
  assert.ok(product.body.seller.id);
  assert.ok(product.body.variants.length > 0);
  assert.deepEqual(product.body.reviews, []);
});

test("отзывы загружаются отдельно, сортируются и фильтруются", async () => {
  const newest = await request(
    "products/laptops-5-1/reviews?page=1&pageSize=2&sort=newest",
  );
  assert.equal(newest.response.status, 200);
  assert.equal(newest.body.items.length, 2);
  assert.ok(
    new Date(newest.body.items[0].createdAt) >=
      new Date(newest.body.items[1].createdAt),
  );

  const oldest = await request(
    "products/laptops-5-1/reviews?page=1&pageSize=2&sort=oldest",
  );
  assert.equal(oldest.response.status, 200);
  assert.ok(
    new Date(oldest.body.items[0].createdAt) <=
      new Date(oldest.body.items[1].createdAt),
  );

  const rating = newest.body.items[0].rating;
  const filtered = await request(
    `products/laptops-5-1/reviews?page=1&pageSize=6&sort=newest&rating=${rating}`,
  );
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.body.items.length > 0);
  assert.ok(filtered.body.items.every((review) => review.rating === rating));
});

test("каталог продавца поддерживает фильтрацию по категории", async () => {
  const product = await request("products/laptops-5-1");
  const sellerId = product.body.seller.id;
  const sellerProducts = await request(
    `products?sellerId=${encodeURIComponent(sellerId)}&pageSize=20`,
  );
  assert.equal(sellerProducts.response.status, 200);
  assert.ok(sellerProducts.body.items.length > 0);
  assert.ok(
    sellerProducts.body.items.every((item) => item.seller.id === sellerId),
  );

  const filtered = await request(
    `products?sellerId=${encodeURIComponent(sellerId)}&category=laptops&pageSize=20`,
  );
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.body.items.length > 0);
  assert.ok(
    filtered.body.items.every(
      (item) =>
        item.seller.id === sellerId && item.category.slug === "laptops",
    ),
  );
});

test("RBAC запрещает покупателю модерацию и управление товарами", async () => {
  const session = await login("buyer@market.local");
  const category = await request("moderation/categories", {
    method: "POST",
    token: session.accessToken,
    body: {
      name: "Запрещённая категория",
      slug: "forbidden-category",
      parentId: null,
    },
  });
  assert.equal(category.response.status, 403);

  const product = await request("seller/products", {
    method: "POST",
    token: session.accessToken,
    body: {
      name: "Запрещённый товар",
      description: "Покупатель не должен создавать этот тестовый товар",
      categoryId: "unknown",
      priceMinor: 10000,
      imageUrl: "https://example.com/product.jpg",
      stock: 1,
    },
  });
  assert.equal(product.response.status, 403);

  const sellerProducts = await request("seller/products", {
    token: session.accessToken,
  });
  assert.equal(sellerProducts.response.status, 403);

  const overview = await request("moderation/overview", {
    token: session.accessToken,
  });
  assert.equal(overview.response.status, 403);

  const users = await request("admin/users", {
    token: session.accessToken,
  });
  assert.equal(users.response.status, 403);
});

test("ролевые кабинеты получают собственные рабочие данные", async () => {
  const sellerSession = await login("seller1@market.local");
  const sellerProducts = await request("seller/products", {
    token: sellerSession.accessToken,
  });
  assert.equal(sellerProducts.response.status, 200);
  assert.ok(sellerProducts.body.items.length > 0);
  assert.ok(
    sellerProducts.body.items.every((product) =>
      ["ACTIVE", "HIDDEN"].includes(product.status),
    ),
  );

  const moderatorSession = await login("moderator@market.local");
  const moderatorOverview = await request("moderation/overview", {
    token: moderatorSession.accessToken,
  });
  assert.equal(moderatorOverview.response.status, 200);
  assert.ok(moderatorOverview.body.categories >= 90);
  assert.ok(moderatorOverview.body.activeProducts > 0);

  const adminSession = await login("admin@market.local");
  const adminOverview = await request("moderation/overview", {
    token: adminSession.accessToken,
  });
  assert.equal(adminOverview.response.status, 200);
  assert.deepEqual(adminOverview.body, moderatorOverview.body);

  const users = await request("admin/users", {
    token: adminSession.accessToken,
  });
  assert.equal(users.response.status, 200);
  assert.ok(users.body.items.length >= 4);
  assert.ok(users.body.items.some((user) => user.roles.includes("ADMIN")));
  assert.ok(users.body.items.every((user) => !("passwordHash" in user)));
});

test("модератор создаёт и удаляет категорию", async () => {
  const session = await login("moderator@market.local");
  const slug = `regression-${Date.now()}`;
  let categoryId = null;
  try {
    const created = await request("moderation/categories", {
      method: "POST",
      token: session.accessToken,
      body: { name: "Регрессионная категория", slug, parentId: null },
    });
    assert.equal(created.response.status, 201);
    categoryId = created.body.id;

    const duplicate = await request("moderation/categories", {
      method: "POST",
      token: session.accessToken,
      body: { name: "Дубликат", slug, parentId: null },
    });
    assert.equal(duplicate.response.status, 409);
  } finally {
    if (categoryId) {
      const removed = await request(`moderation/categories/${categoryId}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      assert.equal(removed.response.status, 204);
    }
  }
});

test("товар продавца проходит HIDDEN → ACTIVE → HIDDEN → DELETED", async () => {
  const session = await login("seller1@market.local");
  const categories = await request("categories");
  const categoryId = categories.body.find(
    (category) => category.parentId === null,
  ).id;
  const slugSuffix = Date.now();
  let productId = null;
  let productSlug = null;

  try {
    const created = await request("seller/products", {
      method: "POST",
      token: session.accessToken,
      body: {
        name: `Регрессионный товар ${slugSuffix}`,
        description:
          "Временный товар для проверки полного жизненного цикла публикации",
        categoryId,
        priceMinor: 12345,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
        stock: 3,
      },
    });
    assert.equal(created.response.status, 201);
    productId = created.body.id;
    productSlug = created.body.slug;

    // Новый товар не должен попадать в публичную выдачу до ручной активации.
    assert.equal((await request(`products/${productSlug}`)).response.status, 404);

    assert.equal(
      (
        await request(`seller/products/${productId}/restore`, {
          method: "PATCH",
          token: session.accessToken,
        })
      ).response.status,
      204,
    );
    assert.equal((await request(`products/${productSlug}`)).response.status, 200);

    assert.equal(
      (
        await request(`seller/products/${productId}/hide`, {
          method: "PATCH",
          token: session.accessToken,
        })
      ).response.status,
      204,
    );
    assert.equal((await request(`products/${productSlug}`)).response.status, 404);
  } finally {
    if (productId) {
      const removed = await request(`seller/products/${productId}`, {
        method: "DELETE",
        token: session.accessToken,
      });
      assert.equal(removed.response.status, 204);
    }
  }
});

test("checkout создаёт заказ с reservation и защищён JWT", async () => {
  const unauthorized = await request("checkout", {
    method: "POST",
    body: {
      items: [{ productId: "p1", quantity: 1 }],
      deliveryAddress: "Кишинёв",
      paymentMethod: "CARD",
      idempotencyKey: "unauthorized",
    },
  });
  assert.equal(unauthorized.response.status, 401);

  const session = await login("buyer@market.local");
  const list = await request("products?page=1&pageSize=20");
  const product = list.body.items.find((item) => item.inStock);
  assert.ok(product);
  const checkout = await request("checkout", {
    method: "POST",
    token: session.accessToken,
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      deliveryAddress: "Кишинёв, центр",
      paymentMethod: "CARD",
      idempotencyKey: `regression-${Date.now()}`,
    },
  });
  assert.equal(checkout.response.status, 201);
  assert.equal(checkout.body.status, "RESERVED");
  assert.equal(checkout.body.totalMinor, product.priceMinor);

  const orders = await request("orders", { token: session.accessToken });
  assert.equal(orders.response.status, 200);
  assert.ok(orders.body.some((order) => order.id === checkout.body.id));
});

test("media-service выдаёт signed upload ticket только авторизованным", async () => {
  const unauthorized = await request("media/uploads/sign", {
    method: "POST",
    body: { filename: "photo.jpg", contentType: "image/jpeg", size: 1000 },
  });
  assert.equal(unauthorized.response.status, 401);

  const session = await login("seller1@market.local");
  const signed = await request("media/uploads/sign", {
    method: "POST",
    token: session.accessToken,
    body: { filename: "photo.jpg", contentType: "image/jpeg", size: 1000 },
  });
  assert.equal(signed.response.status, 201);
  assert.match(signed.body.uploadUrl, /X-Amz-Signature=/);
  assert.match(signed.body.publicUrl, /marketplace-media/);
});

test("analytics принимает события и отдаёт seller read model", async () => {
  const product = await request("products/laptops-5-1");
  const sellerId = product.body.seller.id;
  const recorded = await request("analytics/events", {
    method: "POST",
    body: {
      name: "PRODUCT_VIEW",
      productId: product.body.id,
      sellerId,
      categoryId: product.body.category.id,
    },
  });
  assert.equal(recorded.response.status, 201);

  const sellerSession = await login("seller1@market.local");
  const stats = await request(`analytics/sellers/${sellerId}`, {
    token: sellerSession.accessToken,
  });
  assert.equal(stats.response.status, 200);
  assert.equal(stats.body.sellerId, sellerId);
  assert.ok(stats.body.productViews >= 1);
});

test("search-indexer умеет reindex и поиск через gateway", async () => {
  const reindex = await request("search/reindex", { method: "POST" });
  assert.equal(reindex.response.status, 201);
  assert.ok(reindex.body.indexed > 0);

  const search = await request(
    `search/products?page=1&pageSize=20&search=${encodeURIComponent("AeroBook")}`,
  );
  assert.equal(search.response.status, 200);
  assert.equal(search.body.page, 1);
  assert.ok(Array.isArray(search.body.items));
});
