import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddProductSalesCount1770900000000 implements MigrationInterface {
  name = "AddProductSalesCount1770900000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");
    if (!table?.findColumnByName("sales_count")) {
      await queryRunner.addColumn(
        "products",
        new TableColumn({
          name: "sales_count",
          type: "integer",
          default: "0",
        }),
      );
    }

    // Для демо-данных продаж ещё нет order-service, поэтому проставляем
    // стабильную витринную метрику: она позволяет тестировать топы без random.
    await queryRunner.query(`
      UPDATE products
      SET sales_count = 25 + (abs(hashtext(id)) % 5000)
      WHERE sales_count = 0
    `);

    const refreshedTable = await queryRunner.getTable("products");
    if (!refreshedTable?.indices.some((index) => index.name === "products_sales_idx")) {
      await queryRunner.createIndex(
        "products",
        new TableIndex({
          name: "products_sales_idx",
          columnNames: ["category_id", "status", "sales_count"],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");
    if (table?.indices.some((index) => index.name === "products_sales_idx")) {
      await queryRunner.dropIndex("products", "products_sales_idx");
    }
    if (table?.findColumnByName("sales_count")) {
      await queryRunner.dropColumn("products", "sales_count");
    }
  }
}
