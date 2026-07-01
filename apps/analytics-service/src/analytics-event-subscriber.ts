import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { connect, type NatsConnection } from "nats";
import { AnalyticsService } from "./analytics.service";

interface OrderCreatedEvent {
  orderId: string;
  lines: Array<{
    productId: string;
    sellerId: string;
    categoryId: string;
    quantity: number;
  }>;
}

@Injectable()
export class AnalyticsEventSubscriber implements OnModuleInit, OnApplicationShutdown {
  private connection: NatsConnection | null = null;

  constructor(private readonly analytics: AnalyticsService) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect({
      servers: process.env.NATS_URL ?? "nats://localhost:4222",
    }).catch(() => null);
    if (!this.connection) return;

    const sub = this.connection.subscribe("marketplace.order.created");
    void (async () => {
      for await (const msg of sub) {
        const event = msg.json<OrderCreatedEvent>();
        for (const line of event.lines) {
          await this.analytics.record({
            name: "CHECKOUT_CREATED",
            orderId: event.orderId,
            productId: line.productId,
            sellerId: line.sellerId,
            categoryId: line.categoryId,
            quantity: line.quantity,
          });
        }
      }
    })();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection?.drain();
  }
}
