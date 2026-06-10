import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { Pool } from "pg";

const categorySeeds = [
  { id: "category-clothes", slug: "clothes", name: "Одежда" },
  { id: "category-laptops", slug: "laptops", name: "Ноутбуки" },
  { id: "category-toys", slug: "toys", name: "Детские игрушки" },
] as const;

const extendedCategorySeeds = [
  ["electronics", "Электроника"],
  ["home", "Дом и интерьер"],
  ["beauty", "Красота и уход"],
  ["sports", "Спорт и отдых"],
  ["books", "Книги"],
  ["auto", "Автотовары"],
  ["garden", "Сад и дача"],
  ["pets", "Товары для животных"],
  ["food", "Продукты"],
  ["health", "Здоровье"],
  ["office", "Офис"],
  ["tools", "Инструменты"],
  ["jewelry", "Украшения"],
  ["travel", "Путешествия"],
  ["hobbies", "Хобби и творчество"],
] as const;

const sellerNames = [
  "TechNova",
  "Urban Loom",
  "BrightKid",
  "North Market",
  "Pixel & Play",
] as const;

const productNames: Record<string, readonly string[]> = {
  clothes: [
    "Льняная рубашка",
    "Городская куртка",
    "Базовый свитшот",
    "Шерстяное пальто",
    "Хлопковая футболка",
    "Прямые джинсы",
    "Трикотажное платье",
    "Лёгкий кардиган",
    "Спортивные брюки",
    "Тёплый жилет",
  ],
  laptops: [
    "AeroBook 14",
    "Nova Pro 16",
    "PixelMate Air",
    "Workstation X15",
    "Orbit Gaming 17",
    "StudyBook 13",
    "Creator OLED 15",
    "Business Slim 14",
    "TravelBook Mini",
    "Vector Ryzen 16",
  ],
  toys: [
    "Магнитный конструктор",
    "Деревянная железная дорога",
    "Набор юного химика",
    "Мягкий медведь",
    "Кукольный дом",
    "Радиоуправляемая машина",
    "Пазл на 100 деталей",
    "Набор для рисования",
    "Развивающий куб",
    "Космическая ракета",
  ],
};

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 30,
    idleTimeoutMillis: 30_000,
  });

  async onModuleInit(): Promise<void> {
    // Инициализация при старте используется только для локального preview.
    // Перед production-релизом схему необходимо вынести в отдельные миграции.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id text PRIMARY KEY,
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        parent_id text REFERENCES categories(id) ON DELETE RESTRICT
      );
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS parent_id text REFERENCES categories(id) ON DELETE RESTRICT;
      CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);
      CREATE TABLE IF NOT EXISTS sellers (
        id text PRIMARY KEY,
        name text NOT NULL,
        rating numeric(3,2) NOT NULL,
        review_count integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id text PRIMARY KEY,
        slug text UNIQUE NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        category_id text NOT NULL REFERENCES categories(id),
        seller_id text NOT NULL REFERENCES sellers(id),
        price_minor integer NOT NULL CHECK (price_minor >= 0),
        currency text NOT NULL DEFAULT 'USD',
        rating numeric(3,2) NOT NULL,
        review_count integer NOT NULL,
        image_url text NOT NULL,
        stock integer NOT NULL CHECK (stock >= 0),
        status text NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS product_variants (
        id text PRIMARY KEY,
        product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        slug text NOT NULL,
        name text NOT NULL,
        value text NOT NULL,
        price_minor integer NOT NULL CHECK (price_minor >= 0),
        stock integer NOT NULL CHECK (stock >= 0),
        image_url text NOT NULL,
        UNIQUE(product_id, slug)
      );
      CREATE TABLE IF NOT EXISTS product_reviews (
        id text PRIMARY KEY,
        product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        author_name text NOT NULL,
        author_avatar_url text,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        review_text text NOT NULL,
        created_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS product_variants_product_idx
        ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS product_reviews_product_idx
        ON product_reviews(product_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS products_listing_idx
        ON products(category_id, status, rating DESC, price_minor);
      CREATE INDEX IF NOT EXISTS products_seller_idx
        ON products(seller_id, status);
    `);

    for (const category of categorySeeds) {
      await this.pool.query(
        `INSERT INTO categories (id, slug, name) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [category.id, category.slug, category.name],
      );
    }
    await this.seedExtendedCategories();
    for (let sellerIndex = 0; sellerIndex < sellerNames.length; sellerIndex += 1) {
      await this.pool.query(
        `INSERT INTO sellers (id, name, rating, review_count)
         VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [
          `seller-${sellerIndex + 1}`,
          sellerNames[sellerIndex],
          4.55 + sellerIndex * 0.08,
          120 + sellerIndex * 47,
        ],
      );
    }
    await this.seedProducts();
    await this.seedExtendedProducts();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }

  private async seedProducts(): Promise<void> {
    // Seed детерминирован: одинаковые входные данные дают те же 150 товаров,
    // поэтому E2E-тесты и скриншоты не зависят от случайных значений.
    let sequence = 0;
    for (const category of categorySeeds) {
      for (let sellerIndex = 0; sellerIndex < 5; sellerIndex += 1) {
        for (let productIndex = 0; productIndex < 10; productIndex += 1) {
          sequence += 1;
          const id = `product-${String(sequence).padStart(3, "0")}`;
          const baseName = productNames[category.slug]?.[productIndex] ?? "Товар";
          const name = `${baseName} ${sellerNames[sellerIndex]}`;
          const categoryBase =
            category.slug === "laptops" ? 54900 : category.slug === "clothes" ? 2900 : 1900;
          const priceMinor =
            categoryBase + sellerIndex * 1700 + productIndex * (category.slug === "laptops" ? 5300 : 740);
          await this.pool.query(
            `INSERT INTO products (
               id, slug, name, description, category_id, seller_id, price_minor,
               rating, review_count, image_url, stock
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (id) DO NOTHING`,
            [
              id,
              `${category.slug}-${sellerIndex + 1}-${productIndex + 1}`,
              name,
              `Проверенный товар от ${sellerNames[sellerIndex]}. Быстрая отправка, гарантия качества и удобный возврат.`,
              category.id,
              `seller-${sellerIndex + 1}`,
              priceMinor,
              3.9 + ((sellerIndex + productIndex) % 10) * 0.1,
              8 + ((sellerIndex * 31 + productIndex * 13) % 180),
              `https://picsum.photos/seed/${category.slug}-${sellerIndex}-${productIndex}/720/540`,
              4 + ((sellerIndex * 7 + productIndex * 11) % 55),
            ],
          );
          await this.seedProductDetails({
            id,
            categorySlug: category.slug,
            basePrice: priceMinor,
            imageSeed: `${category.slug}-${sellerIndex}-${productIndex}`,
            sequence,
          });
        }
      }
    }
  }

  private async seedExtendedCategories(): Promise<void> {
    for (let rootIndex = 0; rootIndex < extendedCategorySeeds.length; rootIndex += 1) {
      const [rootSlug, rootName] = extendedCategorySeeds[rootIndex]!;
      const rootId = `category-${rootSlug}`;
      await this.pool.query(
        `INSERT INTO categories (id, slug, name, parent_id)
         VALUES ($1, $2, $3, NULL) ON CONFLICT (id) DO NOTHING`,
        [rootId, rootSlug, rootName],
      );

      // Пять дочерних узлов образуют разные формы дерева, но ни одна ветка
      // не превышает ограничение маркетплейса в пять уровней.
      const parentIndexesByRoot = [
        [null, null, null, null, null],
        [null, 0, 0, 1, 1],
        [null, 0, 1, 2, 2],
      ] as const;
      const shape = parentIndexesByRoot[rootIndex % parentIndexesByRoot.length]!;
      for (let childIndex = 0; childIndex < 5; childIndex += 1) {
        const childNumber = childIndex + 1;
        const childId = `${rootId}-sub-${childNumber}`;
        const parentIndex = shape[childIndex] ?? null;
        const parentId =
          parentIndex === null ? rootId : `${rootId}-sub-${parentIndex + 1}`;
        await this.pool.query(
          `INSERT INTO categories (id, slug, name, parent_id)
           VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [
            childId,
            `${rootSlug}-sub-${childNumber}`,
            `${rootName}: раздел ${childNumber}`,
            parentId,
          ],
        );
      }
    }
  }

  private async seedExtendedProducts(): Promise<void> {
    // PostgreSQL создаёт весь объём одним пакетным запросом: локальный запуск
    // остаётся быстрым даже при десятках тысяч демонстрационных товаров.
    await this.pool.query(`
      INSERT INTO products (
        id, slug, name, description, category_id, seller_id, price_minor,
        rating, review_count, image_url, stock, status
      )
      SELECT
        'generated-' || c.slug || '-' || series.number,
        c.slug || '-item-' || series.number,
        c.name || ' — товар ' || series.number,
        'Демонстрационный товар категории «' || c.name ||
          '». Подробное описание, гарантия качества и удобная доставка.',
        c.id,
        'seller-' || (((series.number - 1) % 5) + 1),
        1200 + ((abs(hashtext(c.slug)) + series.number * 137) % 250000),
        3.8 + (((series.number + abs(hashtext(c.slug))) % 13) / 10.0),
        5 + ((series.number * 17 + abs(hashtext(c.slug))) % 480),
        'https://picsum.photos/seed/' || c.slug || '-' || series.number || '/720/540',
        1 + ((series.number * 11 + abs(hashtext(c.slug))) % 100),
        'ACTIVE'
      FROM categories c
      CROSS JOIN LATERAL generate_series(
        1,
        150 + (abs(hashtext(c.slug)) % 351)
      ) AS series(number)
      WHERE c.id LIKE 'category-%'
        AND c.id NOT IN ('category-clothes', 'category-laptops', 'category-toys')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  private async seedProductDetails(input: {
    id: string;
    categorySlug: string;
    basePrice: number;
    imageSeed: string;
    sequence: number;
  }): Promise<void> {
    const variants =
      input.categorySlug === "clothes"
        ? [["s", "Размер", "S"], ["m", "Размер", "M"], ["l", "Размер", "L"]]
        : input.categorySlug === "laptops"
          ? [
              ["16-512", "Конфигурация", "16 ГБ / 512 ГБ"],
              ["32-1024", "Конфигурация", "32 ГБ / 1 ТБ"],
              ["64-2048", "Конфигурация", "64 ГБ / 2 ТБ"],
            ]
          : [
              ["lime", "Цвет", "Лаймовый"],
              ["coral", "Цвет", "Коралловый"],
              ["blue", "Цвет", "Синий"],
            ];

    for (let index = 0; index < variants.length; index += 1) {
      const [slug, name, value] = variants[index]!;
      await this.pool.query(
        `INSERT INTO product_variants (
           id, product_id, slug, name, value, price_minor, stock, image_url
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (product_id, slug) DO NOTHING`,
        [
          `${input.id}-variant-${index + 1}`,
          input.id,
          slug,
          name,
          value,
          input.basePrice + index * Math.max(500, Math.round(input.basePrice * 0.08)),
          4 + ((input.sequence + index * 7) % 18),
          `https://picsum.photos/seed/${input.imageSeed}-variant-${index}/720/540`,
        ],
      );
    }

    const reviewTexts = [
      "Товар соответствует описанию, качество хорошее. Доставка пришла вовремя.",
      "Пользуюсь уже несколько недель. Удобно, аккуратно сделано и цена оправдана.",
      "Продавец быстро ответил на вопросы. Покупкой доволен, могу рекомендовать.",
    ];
    const authors = ["Елена К.", "Михаил Р.", "Ольга Н."];
    for (let index = 0; index < reviewTexts.length; index += 1) {
      await this.pool.query(
        `INSERT INTO product_reviews (
           id, product_id, author_name, author_avatar_url, rating,
           review_text, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          `${input.id}-review-${index + 1}`,
          input.id,
          authors[index],
          `https://picsum.photos/seed/reviewer-${input.sequence}-${index}/96/96`,
          4 + ((input.sequence + index) % 2),
          reviewTexts[index],
          new Date(Date.UTC(2026, 4, 20 - index)).toISOString(),
        ],
      );
    }
  }
}
