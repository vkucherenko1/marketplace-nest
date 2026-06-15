import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from "typeorm";

export class InitialCatalogSchema1770800000000 implements MigrationInterface {
  name = "InitialCatalogSchema1770800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("categories"))) {
      await queryRunner.createTable(
        new Table({
          name: "categories",
          columns: [
            { name: "id", type: "text", isPrimary: true },
            { name: "slug", type: "text", isUnique: true },
            { name: "name", type: "text" },
            { name: "parent_id", type: "text", isNullable: true },
          ],
          foreignKeys: [
            {
              columnNames: ["parent_id"],
              referencedTableName: "categories",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        "categories",
        new TableIndex({
          name: "categories_parent_idx",
          columnNames: ["parent_id"],
        }),
      );
    }

    if (!(await queryRunner.hasTable("sellers"))) {
      await queryRunner.createTable(
        new Table({
          name: "sellers",
          columns: [
            { name: "id", type: "text", isPrimary: true },
            { name: "name", type: "text" },
            { name: "rating", type: "numeric", precision: 3, scale: 2 },
            { name: "review_count", type: "integer" },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable("products"))) {
      await queryRunner.createTable(
        new Table({
          name: "products",
          columns: [
            { name: "id", type: "text", isPrimary: true },
            { name: "slug", type: "text", isUnique: true },
            { name: "name", type: "text" },
            { name: "description", type: "text" },
            { name: "category_id", type: "text" },
            { name: "seller_id", type: "text" },
            { name: "price_minor", type: "integer" },
            { name: "currency", type: "text", default: "'USD'" },
            { name: "rating", type: "numeric", precision: 3, scale: 2 },
            { name: "review_count", type: "integer" },
            { name: "image_url", type: "text" },
            { name: "stock", type: "integer" },
            { name: "status", type: "text", default: "'ACTIVE'" },
            { name: "created_at", type: "timestamptz", default: "now()" },
            { name: "updated_at", type: "timestamptz", default: "now()" },
          ],
          foreignKeys: [
            {
              columnNames: ["category_id"],
              referencedTableName: "categories",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
            {
              columnNames: ["seller_id"],
              referencedTableName: "sellers",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
          ],
        }),
      );
      await queryRunner.createIndices("products", [
        new TableIndex({
          name: "products_listing_idx",
          columnNames: ["category_id", "status", "rating", "price_minor"],
        }),
        new TableIndex({
          name: "products_seller_idx",
          columnNames: ["seller_id", "status"],
        }),
      ]);
    }

    if (!(await queryRunner.hasTable("product_variants"))) {
      await queryRunner.createTable(
        new Table({
          name: "product_variants",
          columns: [
            { name: "id", type: "text", isPrimary: true },
            { name: "product_id", type: "text" },
            { name: "slug", type: "text" },
            { name: "name", type: "text" },
            { name: "value", type: "text" },
            { name: "price_minor", type: "integer" },
            { name: "stock", type: "integer" },
            { name: "image_url", type: "text" },
          ],
          uniques: [{ columnNames: ["product_id", "slug"] }],
          foreignKeys: [
            {
              columnNames: ["product_id"],
              referencedTableName: "products",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        "product_variants",
        new TableIndex({
          name: "product_variants_product_idx",
          columnNames: ["product_id"],
        }),
      );
    }

    if (!(await queryRunner.hasTable("product_reviews"))) {
      await queryRunner.createTable(
        new Table({
          name: "product_reviews",
          columns: [
            { name: "id", type: "text", isPrimary: true },
            { name: "product_id", type: "text" },
            { name: "author_name", type: "text" },
            { name: "author_avatar_url", type: "text", isNullable: true },
            { name: "rating", type: "integer" },
            { name: "review_text", type: "text" },
            { name: "created_at", type: "timestamptz" },
          ],
          foreignKeys: [
            {
              columnNames: ["product_id"],
              referencedTableName: "products",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        "product_reviews",
        new TableIndex({
          name: "product_reviews_product_idx",
          columnNames: ["product_id", "created_at"],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("product_reviews", true);
    await queryRunner.dropTable("product_variants", true);
    await queryRunner.dropTable("products", true);
    await queryRunner.dropTable("sellers", true);
    await queryRunner.dropTable("categories", true);
  }
}
