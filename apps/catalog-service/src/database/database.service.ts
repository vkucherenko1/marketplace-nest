import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CategoryEntity } from "./entities/category.entity";
import { ProductReviewEntity } from "./entities/product-review.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { ProductEntity } from "./entities/product.entity";
import { SellerEntity } from "./entities/seller.entity";

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

const demoPhotoIds = [
  "1517336714731-489689fd1ca8",
  "1496181133206-80ce9b88a853",
  "1521572163474-6864f9cf17ab",
  "1515886657613-9f3515b0c78f",
  "1542291026-7eec264c27ff",
  "1558618666-fcd25c85cd64",
  "1515488042361-ee00e0ddd4e4",
  "1596462502278-27bfdc403348",
  "1500530855697-b586d89ba3ee",
  "1519681393784-d120267933ba",
] as const;

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(SellerEntity)
    private readonly sellers: Repository<SellerEntity>,
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variants: Repository<ProductVariantEntity>,
    @InjectRepository(ProductReviewEntity)
    private readonly reviews: Repository<ProductReviewEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedCategories();
    await this.seedSellers();
    if ((await this.products.count()) === 0) {
      // Большой preview-seed вставляется пакетами через ORM, чтобы старт
      // оставался быстрым и не создавал десятки тысяч отдельных запросов.
      await this.seedProducts();
    }
  }

  private async seedCategories(): Promise<void> {
    await this.insertIgnoring(
      this.categories,
      categorySeeds.map((category) => ({ ...category, parentId: null })),
    );

    const roots = extendedCategorySeeds.map(([slug, name]) => ({
      id: `category-${slug}`,
      slug,
      name,
      parentId: null,
    }));
    await this.insertIgnoring(this.categories, roots);

    const parentIndexesByRoot = [
      [null, null, null, null, null],
      [null, 0, 0, 1, 1],
      [null, 0, 1, 2, 2],
    ] as const;
    for (let childIndex = 0; childIndex < 5; childIndex += 1) {
      const levelItems = extendedCategorySeeds.map(
        ([rootSlug, rootName], rootIndex) => {
          const rootId = `category-${rootSlug}`;
          const parentIndex =
            parentIndexesByRoot[rootIndex % parentIndexesByRoot.length]?.[
              childIndex
            ] ?? null;
          return {
            id: `${rootId}-sub-${childIndex + 1}`,
            slug: `${rootSlug}-sub-${childIndex + 1}`,
            name: `${rootName}: раздел ${childIndex + 1}`,
            parentId:
              parentIndex === null
                ? rootId
                : `${rootId}-sub-${parentIndex + 1}`,
          };
        },
      );
      await this.insertIgnoring(this.categories, levelItems);
    }
  }

  private async seedSellers(): Promise<void> {
    await this.insertIgnoring(
      this.sellers,
      sellerNames.map((name, index) => ({
        id: `seller-${index + 1}`,
        name,
        rating: 4.55 + index * 0.08,
        reviewCount: 120 + index * 47,
      })),
    );
  }

  private async seedProducts(): Promise<void> {
    const products: Array<Partial<ProductEntity>> = [];
    const variants: Array<Partial<ProductVariantEntity>> = [];
    const reviews: Array<Partial<ProductReviewEntity>> = [];
    let sequence = 0;

    for (const category of categorySeeds) {
      for (let sellerIndex = 0; sellerIndex < 5; sellerIndex += 1) {
        for (let productIndex = 0; productIndex < 10; productIndex += 1) {
          sequence += 1;
          const id = `product-${String(sequence).padStart(3, "0")}`;
          const baseName = productNames[category.slug]?.[productIndex] ?? "Товар";
          const name = `${baseName} ${sellerNames[sellerIndex]}`;
          const categoryBase =
            category.slug === "laptops"
              ? 54_900
              : category.slug === "clothes"
                ? 2_900
                : 1_900;
          const priceMinor =
            categoryBase +
            sellerIndex * 1_700 +
            productIndex * (category.slug === "laptops" ? 5_300 : 740);
          products.push({
            id,
            slug: `${category.slug}-${sellerIndex + 1}-${productIndex + 1}`,
            name,
            description: `Проверенный товар от ${sellerNames[sellerIndex]}. Быстрая отправка, гарантия качества и удобный возврат.`,
            categoryId: category.id,
            sellerId: `seller-${sellerIndex + 1}`,
            priceMinor,
            rating: 3.9 + ((sellerIndex + productIndex) % 10) * 0.1,
            reviewCount: 8 + ((sellerIndex * 31 + productIndex * 13) % 180),
            salesCount:
              80 + (10 - productIndex) * 35 + sellerIndex * 17 + sequence,
            imageUrl: demoImageUrl(`${category.slug}-${sellerIndex}-${productIndex}`),
            stock: 4 + ((sellerIndex * 7 + productIndex * 11) % 55),
            status: "ACTIVE",
          });
          this.addProductDetails({
            productId: id,
            categorySlug: category.slug,
            basePrice: priceMinor,
            imageSeed: `${category.slug}-${sellerIndex}-${productIndex}`,
            sequence,
            variants,
            reviews,
          });
        }
      }
    }

    const extendedCategories = await this.categories.find({
      where: extendedCategorySeeds.flatMap(([slug]) => [
        { id: `category-${slug}` },
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `category-${slug}-sub-${index + 1}`,
        })),
      ]),
    });
    for (const category of extendedCategories) {
      const hash = stableHash(category.slug);
      const count = 150 + (hash % 351);
      for (let number = 1; number <= count; number += 1) {
        products.push({
          id: `generated-${category.slug}-${number}`,
          slug: `${category.slug}-item-${number}`,
          name: `${category.name} — товар ${number}`,
          description: `Демонстрационный товар категории «${category.name}». Подробное описание, гарантия качества и удобная доставка.`,
          categoryId: category.id,
          sellerId: `seller-${((number - 1) % 5) + 1}`,
          priceMinor: 1_200 + ((hash + number * 137) % 250_000),
          rating: 3.8 + ((number + hash) % 13) / 10,
          reviewCount: 5 + ((number * 17 + hash) % 480),
          salesCount: 25 + ((hash + number * 53) % 5_000),
          imageUrl: demoImageUrl(`${category.slug}-${number}`),
          stock: 1 + ((number * 11 + hash) % 100),
          status: "ACTIVE",
        });
      }
    }

    await this.insertIgnoring(this.products, products, 1_000);
    await this.insertIgnoring(this.variants, variants, 1_000);
    await this.insertIgnoring(this.reviews, reviews, 1_000);
  }

  private addProductDetails(input: {
    productId: string;
    categorySlug: string;
    basePrice: number;
    imageSeed: string;
    sequence: number;
    variants: Array<Partial<ProductVariantEntity>>;
    reviews: Array<Partial<ProductReviewEntity>>;
  }): void {
    const variantValues: ReadonlyArray<readonly [string, string, string]> =
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
    variantValues.forEach(([slug, name, value], index) => {
      input.variants.push({
        id: `${input.productId}-variant-${index + 1}`,
        productId: input.productId,
        slug,
        name,
        value,
        priceMinor:
          input.basePrice +
          index * Math.max(500, Math.round(input.basePrice * 0.08)),
        stock: 4 + ((input.sequence + index * 7) % 18),
        imageUrl: demoImageUrl(`${input.imageSeed}-variant-${index}`),
      });
    });

    const reviewTexts = [
      "Товар соответствует описанию, качество хорошее. Доставка пришла вовремя.",
      "Пользуюсь уже несколько недель. Удобно, аккуратно сделано и цена оправдана.",
      "Продавец быстро ответил на вопросы. Покупкой доволен, могу рекомендовать.",
    ];
    const authors = ["Елена К.", "Михаил Р.", "Ольга Н."];
    reviewTexts.forEach((reviewText, index) => {
      input.reviews.push({
        id: `${input.productId}-review-${index + 1}`,
        productId: input.productId,
        authorName: authors[index]!,
        authorAvatarUrl: demoImageUrl(`reviewer-${input.sequence}-${index}`, 96, 96),
        rating: 4 + ((input.sequence + index) % 2),
        reviewText,
        createdAt: new Date(Date.UTC(2026, 4, 20 - index)),
      });
    });
  }

  private async insertIgnoring<T extends object>(
    repository: Repository<T>,
    values: Array<Partial<T>>,
    chunkSize = 250,
  ): Promise<void> {
    for (let offset = 0; offset < values.length; offset += chunkSize) {
      await repository
        .createQueryBuilder()
        .insert()
        .values(values.slice(offset, offset + chunkSize) as never)
        .orIgnore()
        .execute();
    }
  }
}

function stableHash(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function demoImageUrl(seed: string, width = 720, height = 540): string {
  const photoId = demoPhotoIds[stableHash(seed) % demoPhotoIds.length];
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}
