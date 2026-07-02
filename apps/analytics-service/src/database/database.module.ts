import { Module } from "@nestjs/common";
import { createClient } from "@clickhouse/client";
import { ClickHouseSchemaService } from "./clickhouse-schema.service";
import { CLICKHOUSE_CLIENT } from "./clickhouse.constants";

@Module({
  providers: [
    {
      provide: CLICKHOUSE_CLIENT,
      useFactory: () =>
        createClient({
          url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
          username: process.env.CLICKHOUSE_USER ?? "default",
          password: process.env.CLICKHOUSE_PASSWORD ?? "",
        }),
    },
    ClickHouseSchemaService,
  ],
  exports: [CLICKHOUSE_CLIENT],
})
export class DatabaseModule {}
