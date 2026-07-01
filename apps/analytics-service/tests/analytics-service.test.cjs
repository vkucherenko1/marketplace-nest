const assert = require("node:assert/strict");
const test = require("node:test");
const { AnalyticsService } = require("../dist/analytics.service.js");

test("analytics агрегирует события продавца по товарам", async () => {
  const events = [];
  const service = new AnalyticsService({
    record: async (event) => events.push(event),
    enforceRetention: async () => 0,
    sellerAnalytics: async (sellerId) => {
      const rows = events.filter((event) => event.sellerId === sellerId);
      return {
        sellerId,
        productViews: rows.filter((event) => event.name === "PRODUCT_VIEW").length,
        searchImpressions: 0,
        addToCart: rows.filter((event) => event.name === "ADD_TO_CART").reduce((sum, event) => sum + (event.quantity ?? 1), 0),
        purchases: rows.filter((event) => event.name === "CHECKOUT_CREATED").reduce((sum, event) => sum + (event.quantity ?? 1), 0),
        topProducts: [{ productId: "p1", views: 1, addToCart: 2, purchases: 1 }],
      };
    },
  });
  await service.record({ name: "PRODUCT_VIEW", sellerId: "seller-1", productId: "p1" });
  await service.record({ name: "ADD_TO_CART", sellerId: "seller-1", productId: "p1", quantity: 2 });
  await service.record({ name: "CHECKOUT_CREATED", sellerId: "seller-1", productId: "p1" });
  await service.record({ name: "PRODUCT_VIEW", sellerId: "seller-2", productId: "p2" });

  const stats = await service.sellerAnalytics("seller-1");
  assert.equal(stats.productViews, 1);
  assert.equal(stats.addToCart, 2);
  assert.equal(stats.purchases, 1);
  assert.equal(stats.topProducts[0].productId, "p1");
});
