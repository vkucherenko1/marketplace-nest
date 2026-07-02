import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderOutboxEvents1771400000000 implements MigrationInterface {
  name = "AddOrderOutboxEvents1771400000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_events" (
        "id" uuid PRIMARY KEY,
        "subject" varchar NOT NULL,
        "payload" jsonb NOT NULL,
        "status" varchar NOT NULL DEFAULT 'PENDING',
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" timestamptz NOT NULL,
        "last_error" text,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_outbox_events_status_next_attempt"
      ON "outbox_events" ("status", "next_attempt_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_outbox_events_status_next_attempt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_events"`);
  }
}
