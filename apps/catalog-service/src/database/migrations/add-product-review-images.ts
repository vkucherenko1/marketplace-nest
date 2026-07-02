import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddProductReviewImages1771500000000 implements MigrationInterface {
  name = "AddProductReviewImages1771500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("product_reviews");
    if (table && !table.findColumnByName("image_urls")) {
      await queryRunner.addColumn(
        "product_reviews",
        new TableColumn({
          name: "image_urls",
          type: "jsonb",
          default: "'[]'::jsonb",
        }),
      );
    }

    await queryRunner.query(`
      WITH review_rows AS (
        SELECT
          id,
          row_number() OVER (ORDER BY created_at DESC, id ASC) AS row_index
        FROM product_reviews
        WHERE image_urls = '[]'::jsonb
      ),
      demo_urls AS (
        SELECT *
        FROM (VALUES
          (1, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=320&h=240&q=80'),
          (2, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=320&h=240&q=80'),
          (3, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=320&h=240&q=80'),
          (4, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=320&h=240&q=80'),
          (5, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=320&h=240&q=80')
        ) AS urls(position, url)
      ),
      selected_urls AS (
        SELECT
          review_rows.id,
          jsonb_agg(demo_urls.url ORDER BY demo_urls.position) AS image_urls
        FROM review_rows
        JOIN demo_urls
          ON demo_urls.position <= ((review_rows.row_index - 1) % 5) + 1
        GROUP BY review_rows.id
      )
      UPDATE product_reviews
      SET image_urls = selected_urls.image_urls
      FROM selected_urls
      WHERE product_reviews.id = selected_urls.id
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("product_reviews");
    if (table?.findColumnByName("image_urls")) {
      await queryRunner.dropColumn("product_reviews", "image_urls");
    }
  }
}
