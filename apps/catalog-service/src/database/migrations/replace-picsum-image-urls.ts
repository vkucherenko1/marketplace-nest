import { MigrationInterface, QueryRunner } from "typeorm";

const demoUrls = [
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&h=540&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=720&h=540&q=80",
] as const;

export class ReplacePicsumImageUrls1771100000000 implements MigrationInterface {
  name = "ReplacePicsumImageUrls1771100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Старые Picsum URL всегда дают HTTP 302. В каталоге это удваивает
    // число запросов к изображениям, поэтому переносим seed на прямые 200 URL.
    await updateTableImages(queryRunner, "products", "id", "image_url", 720, 540);
    await updateTableImages(queryRunner, "product_variants", "id", "image_url", 720, 540);
    await updateTableImages(
      queryRunner,
      "product_reviews",
      "id",
      "author_avatar_url",
      96,
      96,
    );
  }

  async down(): Promise<void> {
    // No-op: возврат к редиректящим URL ухудшит производительность.
  }
}

async function updateTableImages(
  queryRunner: QueryRunner,
  table: string,
  seedColumn: string,
  imageColumn: string,
  width: number,
  height: number,
): Promise<void> {
  const cases = demoUrls
    .map((url, index) => {
      const sizedUrl = url.replace("w=720&h=540", `w=${width}&h=${height}`);
      return `WHEN ${index} THEN '${sizedUrl}'`;
    })
    .join("\n");

  await queryRunner.query(`
    UPDATE ${table}
    SET ${imageColumn} = CASE (abs(hashtext(${seedColumn})) % ${demoUrls.length})
      ${cases}
    END
    WHERE ${imageColumn} LIKE 'https://picsum.photos/%'
  `);
}
