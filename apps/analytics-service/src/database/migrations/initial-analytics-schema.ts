import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class InitialAnalyticsSchema1771400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "analytics_events",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "name", type: "varchar" },
          { name: "order_id", type: "varchar", isNullable: true },
          { name: "product_id", type: "varchar", isNullable: true },
          { name: "seller_id", type: "varchar", isNullable: true },
          { name: "category_id", type: "varchar", isNullable: true },
          { name: "search_query", type: "varchar", isNullable: true },
          { name: "position", type: "integer", isNullable: true },
          { name: "quantity", type: "integer", default: 1 },
          { name: "created_at", type: "timestamptz", default: "CURRENT_TIMESTAMP" },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      "analytics_events",
      new TableIndex({
        name: "analytics_events_seller_created_idx",
        columnNames: ["seller_id", "created_at"],
      }),
    );
    await queryRunner.createIndex(
      "analytics_events",
      new TableIndex({
        name: "analytics_events_retention_idx",
        columnNames: ["created_at"],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("analytics_events", true);
  }
}
