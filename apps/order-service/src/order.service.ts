import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CheckoutRequest, OrderSummary } from "@marketplace/contracts";
import { InventoryClient } from "./inventory.client";
import { NatsEventPublisher } from "./nats-event-publisher";
import { OrderRepository } from "./order.repository";

@Injectable()
export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryClient,
    private readonly events: NatsEventPublisher,
  ) {}

  async createCheckout(
    buyerId: string,
    input: CheckoutRequest,
  ): Promise<OrderSummary> {
    const existing = await this.orders.findByIdempotency(
      buyerId,
      input.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    const orderId = randomUUID();
    const reservedUntil = new Date(Date.now() + 15 * 60_000).toISOString();
    const reservation = await this.inventory.reserve({
      orderId,
      items: input.items,
      expiresAt: reservedUntil,
    });
    const order = await this.orders.create(
      orderId,
      buyerId,
      input.idempotencyKey,
      input.deliveryAddress,
      reservation.lines,
    );
    await this.events.publish("marketplace.order.created", {
      orderId: order.id,
      buyerId,
      totalMinor: order.totalMinor,
      lines: reservation.lines,
      occurredAt: new Date().toISOString(),
    });
    return order;
  }

  listOrders(buyerId: string): Promise<OrderSummary[]> {
    return this.orders.list(buyerId);
  }

  async getOrder(buyerId: string, id: string): Promise<OrderSummary> {
    const order = await this.orders.get(buyerId, id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }
}
