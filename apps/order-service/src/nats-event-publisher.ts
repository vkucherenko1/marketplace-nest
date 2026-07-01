import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { connect, type NatsConnection } from "nats";

@Injectable()
export class NatsEventPublisher implements OnApplicationShutdown {
  private connection: Promise<NatsConnection | null> | null = null;

  async publish(subject: string, payload: unknown): Promise<void> {
    const connection = await this.getConnection();
    if (!connection) {
      return;
    }
    connection.publish(subject, JSON.stringify(payload));
  }

  async onApplicationShutdown(): Promise<void> {
    const connection = await this.connection?.catch(() => null);
    await connection?.drain();
  }

  private getConnection(): Promise<NatsConnection | null> {
    this.connection ??= connect({
      servers: process.env.NATS_URL ?? "nats://localhost:4222",
    }).catch(() => null);
    return this.connection;
  }
}
