import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClickHouseClient } from "@clickhouse/client";
import { CLICKHOUSE_CLIENT } from "./clickhouse.constants";

@Injectable()
export class ClickHouseSchemaService implements OnModuleInit {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly client: ClickHouseClient,
  ) {}

  async onModuleInit(): Promise<void> {
    const database = process.env.CLICKHOUSE_DATABASE ?? "analytics";
    const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS ?? 90);

    await this.client.command({
      query: `CREATE DATABASE IF NOT EXISTS ${database}`,
    });
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS ${database}.analytics_events (
          id String,
          name LowCardinality(String),
          order_id String,
          product_id String,
          seller_id String,
          category_id String,
          search_query String,
          position Nullable(Int32),
          quantity UInt32,
          created_at DateTime64(3, 'UTC')
        )
        ENGINE = MergeTree
        ORDER BY (seller_id, created_at, name, product_id)
        TTL created_at + toIntervalDay(${retentionDays})
      `,
    });
  }
}
