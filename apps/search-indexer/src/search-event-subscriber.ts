import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { connect, type NatsConnection } from "nats";
import { SearchService } from "./search.service";

@Injectable()
export class SearchEventSubscriber implements OnModuleInit, OnApplicationShutdown {
  private connection: NatsConnection | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly search: SearchService) {}

  async onModuleInit(): Promise<void> {
    this.connection = await connect({
      servers: process.env.NATS_URL ?? "nats://localhost:4222",
    }).catch(() => null);
    if (!this.connection) return;

    for (const subject of [
      "marketplace.product.created",
      "marketplace.product.updated",
      "marketplace.review.created",
    ]) {
      const sub = this.connection.subscribe(subject);
      void (async () => {
        for await (const _msg of sub) {
          this.scheduleReindex();
        }
      })();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection?.drain();
  }

  private scheduleReindex(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    // Debounce защищает Meilisearch от шторма событий при массовом импорте.
    this.timer = setTimeout(() => void this.search.reindex(), 1_000);
  }
}
