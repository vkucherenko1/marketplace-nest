import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizePicsumImageUrls1771000000000 implements MigrationInterface {
  name = "NormalizePicsumImageUrls1771000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Picsum без расширения отдаёт 302 на финальный jpeg. Для каталога это
    // лишняя сеть на каждую карточку, поэтому seed URL храним сразу с `.jpg`.
    await queryRunner.query(`
      UPDATE products
      SET image_url = image_url || '.jpg'
      WHERE image_url LIKE 'https://picsum.photos/seed/%'
        AND image_url NOT LIKE '%.jpg'
    `);
    await queryRunner.query(`
      UPDATE product_variants
      SET image_url = image_url || '.jpg'
      WHERE image_url LIKE 'https://picsum.photos/seed/%'
        AND image_url NOT LIKE '%.jpg'
    `);
    await queryRunner.query(`
      UPDATE product_reviews
      SET author_avatar_url = author_avatar_url || '.jpg'
      WHERE author_avatar_url LIKE 'https://picsum.photos/seed/%'
        AND author_avatar_url NOT LIKE '%.jpg'
    `);
  }

  async down(): Promise<void> {
    // No-op: старые URL с редиректами не нужны, а откат ухудшит загрузку.
  }
}
