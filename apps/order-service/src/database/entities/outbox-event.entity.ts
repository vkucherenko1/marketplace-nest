import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type OutboxEventStatus =
  | "PENDING"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED"
  | "DEAD";

@Entity({ name: "outbox_events" })
@Index(["status", "nextAttemptAt"])
export class OutboxEventEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column()
  subject!: string;

  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ default: "PENDING" })
  status!: OutboxEventStatus;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ name: "next_attempt_at", type: "timestamptz" })
  nextAttemptAt!: Date;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError!: string | null;

  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
