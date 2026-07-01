import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from "typeorm";

export class AddInventoryReservations1771200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "inventory_reservations",
        columns: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "order_id", type: "varchar" },
          { name: "product_id", type: "varchar" },
          { name: "variant_id", type: "varchar", isNullable: true },
          { name: "quantity", type: "integer" },
          { name: "expires_at", type: "timestamptz" },
          { name: "status", type: "varchar", default: "'ACTIVE'" },
          {
            name: "created_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamptz",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      "inventory_reservations",
      new TableIndex({
        name: "inventory_reservations_order_idx",
        columnNames: ["order_id"],
      }),
    );
    await queryRunner.createIndex(
      "inventory_reservations",
      new TableIndex({
        name: "inventory_reservations_expiry_idx",
        columnNames: ["status", "expires_at"],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("inventory_reservations", true);
  }
}
