const assert = require("node:assert/strict");
const test = require("node:test");
const { OrderService } = require("../dist/order.service.js");

function createService() {
  const saved = new Map();
  const repository = {
    findByIdempotency: async (_buyerId, key) => saved.get(key) ?? null,
    create: async (orderId, buyerId, key, deliveryAddress, lines) => {
      const order = {
        id: orderId,
        buyerId,
        status: "RESERVED",
        totalMinor: lines.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0),
        currency: "USD",
        deliveryAddress,
        createdAt: new Date().toISOString(),
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          priceMinor: line.priceMinor,
          reservedUntil: line.reservedUntil,
        })),
      };
      saved.set(key, order);
      return order;
    },
    list: async (buyerId) => [...saved.values()].filter((order) => order.buyerId === buyerId),
    get: async (buyerId, id) =>
      [...saved.values()].find((order) => order.buyerId === buyerId && order.id === id) ?? null,
    setStatus: async (buyerId, id, from, to) => {
      const order = [...saved.values()].find(
        (item) => item.buyerId === buyerId && item.id === id,
      );
      if (!order || order.status !== from) {
        return order ?? null;
      }
      order.status = to;
      return order;
    },
  };
  const inventory = {
    reserve: async (input) => ({
      reservationId: "reservation-1",
      lines: input.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        sellerId: "seller-1",
        categoryId: "category-1",
        quantity: item.quantity,
        priceMinor: 11700,
        reservedUntil: input.expiresAt,
      })),
    }),
    confirm: async () => ({ orderId: "order-1", affected: 1 }),
    release: async () => ({ orderId: "order-1", affected: 1 }),
  };
  return new OrderService(repository, inventory, { publish: async () => undefined });
}

test("checkout фиксирует reservation и idempotency key", async () => {
  const service = createService();
  const input = {
    items: [{ productId: "product-1", variantId: null, quantity: 3 }],
    deliveryAddress: "Кишинёв",
    paymentMethod: "CARD",
    idempotencyKey: "same-key",
  };

  const first = await service.createCheckout("buyer-1", input);
  const second = await service.createCheckout("buyer-1", input);

  assert.equal(first.id, second.id);
  assert.equal(first.status, "RESERVED");
  assert.equal(first.totalMinor, 35100);
  assert.equal(first.items[0].reservedUntil, second.items[0].reservedUntil);
});

test("покупатель видит только свои заказы", async () => {
  const service = createService();
  const input = {
    items: [{ productId: "product-1", quantity: 1 }],
    deliveryAddress: "Кишинёв",
    paymentMethod: "CARD",
    idempotencyKey: "key-1",
  };
  await service.createCheckout("buyer-1", input);
  await service.createCheckout("buyer-2", { ...input, idempotencyKey: "key-2" });

  assert.equal((await service.listOrders("buyer-1")).length, 1);
  const [other] = await service.listOrders("buyer-2");
  await assert.rejects(() => service.getOrder("buyer-1", other.id));
});

test("заказ можно подтвердить или отменить только из резерва", async () => {
  const service = createService();
  const input = {
    items: [{ productId: "product-1", quantity: 1 }],
    deliveryAddress: "Кишинёв",
    paymentMethod: "CARD",
    idempotencyKey: "confirm-key",
  };

  const order = await service.createCheckout("buyer-1", input);
  const paid = await service.confirmOrder("buyer-1", order.id);
  assert.equal(paid.status, "PAID");
  await assert.rejects(() => service.cancelOrder("buyer-1", order.id));

  const cancellable = await service.createCheckout("buyer-1", {
    ...input,
    idempotencyKey: "cancel-key",
  });
  const cancelled = await service.cancelOrder("buyer-1", cancellable.id);
  assert.equal(cancelled.status, "CANCELLED");
});
