import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import type {
  OrderStatus,
  OrderSummary,
  ReservedInventoryLine,
} from "@marketplace/contracts";
import { Repository } from "typeorm";
import { OrderLineEntity } from "./database/entities/order-line.entity";
import { OrderEntity } from "./database/entities/order.entity";

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderLineEntity)
    private readonly lines: Repository<OrderLineEntity>,
  ) {}

  async findByIdempotency(
    buyerId: string,
    idempotencyKey: string,
  ): Promise<OrderSummary | null> {
    const order = await this.orders.findOne({
      where: { buyerId, idempotencyKey },
      relations: { items: true },
    });
    return order ? this.map(order) : null;
  }

  async create(
    orderId: string,
    buyerId: string,
    idempotencyKey: string,
    deliveryAddress: string,
    lines: ReservedInventoryLine[],
  ): Promise<OrderSummary> {
    const totalMinor = lines.reduce(
      (sum, line) => sum + line.priceMinor * line.quantity,
      0,
    );
    const order = await this.orders.save(
      this.orders.create({
        id: orderId,
        buyerId,
        idempotencyKey,
        status: "RESERVED",
        totalMinor,
        currency: "USD",
        deliveryAddress,
      }),
    );
    await this.lines.save(
      lines.map((line) =>
        this.lines.create({
          id: randomUUID(),
          orderId,
          productId: line.productId,
          variantId: line.variantId,
          sellerId: line.sellerId,
          categoryId: line.categoryId,
          quantity: line.quantity,
          priceMinor: line.priceMinor,
          reservedUntil: new Date(line.reservedUntil),
        }),
      ),
    );
    order.items = await this.lines.findBy({ orderId });
    return this.map(order);
  }

  async list(buyerId: string): Promise<OrderSummary[]> {
    const orders = await this.orders.find({
      where: { buyerId },
      relations: { items: true },
      order: { createdAt: "DESC" },
    });
    return orders.map((order) => this.map(order));
  }

  async get(buyerId: string, id: string): Promise<OrderSummary | null> {
    const order = await this.orders.findOne({
      where: { buyerId, id },
      relations: { items: true },
    });
    return order ? this.map(order) : null;
  }

  async setStatus(
    buyerId: string,
    id: string,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<OrderSummary | null> {
    // Статус меняется атомарно: если другой процесс уже подтвердил/отменил
    // заказ, update не затронет строку и сервис перечитает фактическое состояние.
    const result = await this.orders.update({ buyerId, id, status: from }, { status: to });
    if (result.affected !== 1) {
      return this.get(buyerId, id);
    }
    return this.get(buyerId, id);
  }

  private map(order: OrderEntity): OrderSummary {
    return {
      id: order.id,
      buyerId: order.buyerId,
      status: order.status,
      totalMinor: order.totalMinor,
      currency: "USD",
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt.toISOString(),
      items: (order.items ?? []).map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        priceMinor: line.priceMinor,
        reservedUntil: line.reservedUntil.toISOString(),
      })),
    };
  }
}
