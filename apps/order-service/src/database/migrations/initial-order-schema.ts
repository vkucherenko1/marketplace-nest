import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class InitialOrderSchema1771300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "orders",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "buyer_id", type: "varchar" },
          { name: "idempotency_key", type: "varchar" },
          { name: "status", type: "varchar" },
          { name: "total_minor", type: "integer" },
          { name: "currency", type: "varchar", default: "'USD'" },
          { name: "delivery_address", type: "varchar" },
          { name: "created_at", type: "timestamptz", default: "CURRENT_TIMESTAMP" },
          { name: "updated_at", type: "timestamptz", default: "CURRENT_TIMESTAMP" },
        ],
      }),
      true,
    );
    await queryRunner.createTable(
      new Table({
        name: "order_lines",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "order_id", type: "varchar" },
          { name: "product_id", type: "varchar" },
          { name: "variant_id", type: "varchar", isNullable: true },
          { name: "seller_id", type: "varchar" },
          { name: "category_id", type: "varchar" },
          { name: "quantity", type: "integer" },
          { name: "price_minor", type: "integer" },
          { name: "reserved_until", type: "timestamptz" },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      "orders",
      new TableIndex({
        name: "orders_idempotency_idx",
        columnNames: ["buyer_id", "idempotency_key"],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      "orders",
      new TableIndex({
        name: "orders_buyer_created_idx",
        columnNames: ["buyer_id", "created_at"],
      }),
    );
    await queryRunner.createForeignKey(
      "order_lines",
      new TableForeignKey({
        columnNames: ["order_id"],
        referencedTableName: "orders",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );
    await queryRunner.createIndex(
      "order_lines",
      new TableIndex({
        name: "order_lines_order_idx",
        columnNames: ["order_id"],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("order_lines", true);
    await queryRunner.dropTable("orders", true);
  }
}
