import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { connect, type NatsConnection } from "nats";
import { Repository } from "typeorm";
import { OutboxEventEntity } from "../database/entities/outbox-event.entity";

@Injectable()
export class NatsEventPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(NatsEventPublisher.name);
  private connection: Promise<NatsConnection | null> | null = null;
  private flushing = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outbox: Repository<OutboxEventEntity>,
  ) {}

  async publish(subject: string, payload: unknown): Promise<void> {
    // Outbox защищает событие от потери: сначала фиксируем его в БД сервиса,
    // а отдельный воркер доставляет в NATS с повторными попытками.
    await this.outbox.save(
      this.outbox.create({
        id: randomUUID(),
        subject,
        payload: this.toPayload(payload),
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: new Date(),
      }),
    );
    void this.flush();
  }

  onModuleInit(): void {
    const intervalMs = Number(process.env.OUTBOX_FLUSH_INTERVAL_MS ?? 1_000);
    this.flushTimer = setInterval(() => void this.flush(), intervalMs);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
    const connection = await this.connection?.catch(() => null);
    await connection?.drain();
  }

  private async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    this.flushing = true;
    try {
      const events = await this.claimBatch();
      if (events.length === 0) {
        return;
      }
      const connection = await this.getConnectionOrThrow();
      for (const event of events) {
        try {
          connection.publish(event.subject, JSON.stringify(event.payload));
          event.status = "PUBLISHED";
          event.publishedAt = new Date();
          event.lastError = null;
          await this.outbox.save(event);
        } catch (error) {
          await this.markFailed(event, error);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Outbox flush skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.flushing = false;
    }
  }

  private async markFailed(
    event: OutboxEventEntity,
    error: unknown,
  ): Promise<void> {
    event.attempts += 1;
    event.status = event.attempts >= 10 ? "DEAD" : "FAILED";
    event.lastError = error instanceof Error ? error.message : String(error);
    const delayMs = Math.min(60_000, 1_000 * 2 ** event.attempts);
    event.nextAttemptAt = new Date(Date.now() + delayMs);
    await this.outbox.save(event);
  }

  private async claimBatch(): Promise<OutboxEventEntity[]> {
    return this.outbox.manager.transaction(async (manager) => {
      const events = await manager
        .createQueryBuilder(OutboxEventEntity, "event")
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .where("event.status IN (:...statuses)", {
          statuses: ["PENDING", "FAILED", "PROCESSING"],
        })
        .andWhere("event.nextAttemptAt <= :now", { now: new Date() })
        .orderBy("event.createdAt", "ASC")
        .take(Number(process.env.OUTBOX_BATCH_SIZE ?? 50))
        .getMany();

      for (const event of events) {
        // PROCESSING с дедлайном нужен для multi-replica режима: одна реплика
        // забирает событие, другие пропускают его через SKIP LOCKED.
        event.status = "PROCESSING";
        event.nextAttemptAt = new Date(Date.now() + 60_000);
      }
      return manager.save(events);
    });
  }

  private async getConnectionOrThrow(): Promise<NatsConnection> {
    const connection = await this.getConnection();
    if (!connection) {
      throw new Error("NATS connection is not available");
    }
    return connection;
  }

  private getConnection(): Promise<NatsConnection | null> {
    this.connection ??= connect({
      servers: process.env.NATS_URL ?? "nats://localhost:4222",
    }).catch(() => null);
    return this.connection;
  }

  private toPayload(payload: unknown): Record<string, unknown> {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
    return { value: payload };
  }
}
