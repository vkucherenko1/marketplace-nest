import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { connect, type NatsConnection } from "nats";
import { SearchService } from "./search.service";

@Injectable()
export class SearchEventSubscriber implements OnModuleInit, OnApplicationShutdown {
  private connection: NatsConnection | null = null;

  constructor(private readonly search: SearchService) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect({
      servers: process.env.NATS_URL ?? "nats://localhost:4222",
    }).catch(() => null);
    if (!this.connection) return;

    for (const subject of ["marketplace.product.created", "marketplace.product.updated"]) {
      const sub = this.connection.subscribe(subject);
      void (async () => {
        for await (const msg of sub) {
          const event = msg.json<{
            productId: string;
            status?: "ACTIVE" | "HIDDEN" | "DELETED";
            document?: unknown;
          }>();
          await this.search.syncProductDocument({
            productId: event.productId,
            document: (event.document ?? null) as
              | import("@marketplace/contracts").ProductCard
              | null,
            ...(event.status ? { status: event.status } : {}),
          });
        }
      })();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection?.drain();
  }
}
