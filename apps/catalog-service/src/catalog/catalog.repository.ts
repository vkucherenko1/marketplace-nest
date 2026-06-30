import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  Category,
  PageSize,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductReview,
  ProductReviewsResponse,
  PlatformOverview,
  ReviewSort,
  SellerProduct,
  ProductSort,
  ProductVariant,
  SaveCategory,
} from "@marketplace/contracts";
import { randomUUID } from "node:crypto";
import { Brackets, In, Not, Repository } from "typeorm";
import { CategoryEntity } from "../database/entities/category.entity";
import { ProductReviewEntity } from "../database/entities/product-review.entity";
import { ProductVariantEntity } from "../database/entities/product-variant.entity";
import {
  ProductEntity,
  type ProductStatus,
} from "../database/entities/product.entity";

@Injectable()
export class CatalogRepository {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variants: Repository<ProductVariantEntity>,
    @InjectRepository(ProductReviewEntity)
    private readonly reviews: Repository<ProductReviewEntity>,
  ) {}

  async listCategories(): Promise<Category[]> {
    const [categoryEntities, directCounts] = await Promise.all([
      this.categories.find({ order: { name: "ASC" } }),
      this.products
        .createQueryBuilder("product")
        .select("product.categoryId", "categoryId")
        .addSelect("COUNT(product.id)", "productCount")
        .addSelect("COALESCE(SUM(product.salesCount), 0)", "salesCount")
        .where("product.status = :status", { status: "ACTIVE" })
        .groupBy("product.categoryId")
        .getRawMany<{
          categoryId: string;
          productCount: string;
          salesCount: string;
        }>(),
    ]);
    const graph = buildCategoryGraph(categoryEntities);
    const countByCategory = new Map(
      directCounts.map((item) => [item.categoryId, Number(item.productCount)]),
    );
    const salesByCategory = new Map(
      directCounts.map((item) => [item.categoryId, Number(item.salesCount)]),
    );

    return categoryEntities
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        parentId: category.parentId,
        depth: graph.depth(category.id),
        productCount: graph
          .descendants(category.id)
          .reduce((total, id) => total + (countByCategory.get(id) ?? 0), 0),
        salesCount: graph
          .descendants(category.id)
          .reduce((total, id) => total + (salesByCategory.get(id) ?? 0), 0),
      }))
      .sort(
        (left, right) =>
          left.depth - right.depth ||
          left.name.localeCompare(right.name, "ru"),
      );
  }

  async createCategory(input: SaveCategory): Promise<Category> {
    const entity = await this.categories.save(
      this.categories.create({
        id: randomUUID(),
        ...input,
      }),
    );
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      parentId: entity.parentId,
      depth: await this.categoryDepth(entity.id),
      productCount: 0,
      salesCount: 0,
    };
  }

  async categorySlugExists(slug: string, exceptId?: string): Promise<boolean> {
    return this.categories.exists({
      where: exceptId ? { slug, id: Not(exceptId) } : { slug },
    });
  }

  async updateCategory(
    id: string,
    input: SaveCategory,
  ): Promise<Category | null> {
    const category = await this.categories.findOneBy({ id });
    if (!category) {
      return null;
    }
    this.categories.merge(category, input);
    await this.categories.save(category);
    return (await this.listCategories()).find((item) => item.id === id) ?? null;
  }

  async deleteCategory(
    id: string,
  ): Promise<"deleted" | "not_found" | "not_empty"> {
    if (!(await this.categories.existsBy({ id }))) {
      return "not_found";
    }
    const [childCount, productCount] = await Promise.all([
      this.categories.countBy({ parentId: id }),
      this.products.countBy({ categoryId: id }),
    ]);
    if (childCount > 0 || productCount > 0) {
      return "not_empty";
    }
    await this.categories.delete(id);
    return "deleted";
  }

  async categoryDepth(id: string): Promise<number> {
    const graph = buildCategoryGraph(await this.categories.find());
    return graph.depth(id);
  }

  async subtreeDepth(id: string): Promise<number> {
    const graph = buildCategoryGraph(await this.categories.find());
    const rootDepth = graph.depth(id);
    return Math.max(
      0,
      ...graph
        .descendants(id)
        .map((descendantId) => graph.depth(descendantId) - rootDepth + 1),
    );
  }

  async isInSubtree(rootId: string, candidateId: string): Promise<boolean> {
    const graph = buildCategoryGraph(await this.categories.find());
    return graph.descendants(rootId).includes(candidateId);
  }

  async listProducts(input: {
    category?: string;
    sellerId?: string;
    search?: string;
    sort: ProductSort;
    page: number;
    pageSize: PageSize;
  }): Promise<PaginatedResponse<ProductCard>> {
    const query = this.products
      .createQueryBuilder("product")
      .innerJoinAndSelect("product.category", "category")
      .innerJoinAndSelect("product.seller", "seller")
      .where("product.status = :status", { status: "ACTIVE" });

    if (input.category) {
      const categories = await this.categories.find();
      const selected = categories.find(
        (category) => category.slug === input.category,
      );
      const categoryIds = selected
        ? buildCategoryGraph(categories).descendants(selected.id)
        : [];
      if (categoryIds.length === 0) {
        return {
          items: [],
          page: input.page,
          pageSize: input.pageSize,
          total: 0,
          totalPages: 0,
        };
      }
      query.andWhere({ categoryId: In(categoryIds) });
    }

    if (input.sellerId) {
      query.andWhere("product.sellerId = :sellerId", {
        sellerId: input.sellerId,
      });
    }

    if (input.search) {
      query.andWhere(
        new Brackets((search) => {
          search
            .where("product.name ILIKE :search")
            .orWhere("product.description ILIKE :search");
        }),
        { search: `%${input.search}%` },
      );
    }

    const orderBy: Record<
      ProductSort,
      { column: string; direction: "ASC" | "DESC" }
    > = {
      relevance: { column: "product.rating", direction: "DESC" },
      sales: { column: "product.salesCount", direction: "DESC" },
      price_asc: { column: "product.priceMinor", direction: "ASC" },
      price_desc: { column: "product.priceMinor", direction: "DESC" },
      rating: { column: "product.rating", direction: "DESC" },
    };
    const order = orderBy[input.sort];
    query
      .orderBy(order.column, order.direction)
      .addOrderBy("product.reviewCount", "DESC")
      .addOrderBy("product.id", "ASC")
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize);

    // getManyAndCount выполняет пагинацию и подсчёт средствами ORM,
    // не загружая всю выдачу в память приложения.
    const [entities, total] = await query.getManyAndCount();
    return {
      items: entities.map((entity) => this.mapProduct(entity)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async findProductBySlug(slug: string): Promise<ProductDetail | null> {
    const product = await this.products.findOne({
      where: { slug, status: "ACTIVE" },
      relations: {
        category: true,
        seller: true,
        variants: true,
      },
    });
    if (!product) {
      return null;
    }
    return {
      ...this.mapProduct(product),
      variants: product.variants
        .sort(
          (left, right) =>
            left.priceMinor - right.priceMinor || left.id.localeCompare(right.id),
        )
        .map((variant) => this.mapVariant(variant)),
      reviews: [],
    };
  }

  async listProductReviews(
    slug: string,
    input: {
      page: number;
      pageSize: number;
      rating?: number;
      sort: ReviewSort;
    },
  ): Promise<ProductReviewsResponse | null> {
    const product = await this.products.findOne({
      where: { slug, status: "ACTIVE" },
      select: { id: true },
    });
    if (!product) {
      return null;
    }

    const query = this.reviews
      .createQueryBuilder("review")
      .where("review.productId = :productId", { productId: product.id });
    if (input.rating) {
      query.andWhere("review.rating = :rating", { rating: input.rating });
    }
    query
      .orderBy(
        "review.createdAt",
        input.sort === "oldest" ? "ASC" : "DESC",
      )
      .addOrderBy("review.id", "ASC")
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize);

    const [reviews, total] = await query.getManyAndCount();
    return {
      items: reviews.map((review) => this.mapReview(review)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async createProduct(
    sellerId: string,
    input: {
      name: string;
      description: string;
      categoryId: string;
      priceMinor: number;
      imageUrl: string;
      stock: number;
    },
  ): Promise<{ id: string; slug: string }> {
    const id = randomUUID();
    const slug = `${input.name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-|-$/g, "")}-${id.slice(0, 8)}`;
    await this.products.save(
      this.products.create({
        id,
        slug,
        ...input,
        sellerId,
        rating: 0,
        reviewCount: 0,
        salesCount: 0,
        status: "HIDDEN",
      }),
    );
    return { id, slug };
  }

  async listSellerProducts(
    sellerId: string,
    page: number,
    pageSize: PageSize,
  ): Promise<PaginatedResponse<SellerProduct>> {
    // Кабинет продавца читает товары страницами, чтобы объём ответа не рос
    // вместе с ассортиментом и не перегружал браузер при high-load сценариях.
    const [products, total] = await this.products.findAndCount({
      where: { sellerId, status: Not("DELETED") },
      relations: { category: true },
      order: { updatedAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.name,
        },
        priceMinor: product.priceMinor,
        stock: product.stock,
        status: product.status,
        rating: product.rating,
        reviewCount: product.reviewCount,
        salesCount: product.salesCount,
        imageUrl: product.imageUrl,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async platformOverview(): Promise<PlatformOverview> {
    const [
      categories,
      activeProducts,
      hiddenProducts,
      sellers,
      reviews,
    ] = await Promise.all([
      this.categories.count(),
      this.products.countBy({ status: "ACTIVE" }),
      this.products.countBy({ status: "HIDDEN" }),
      this.products
        .createQueryBuilder("product")
        .select("COUNT(DISTINCT product.sellerId)", "count")
        .where("product.status != :status", { status: "DELETED" })
        .getRawOne<{ count: string }>(),
      this.reviews.count(),
    ]);
    return {
      categories,
      activeProducts,
      hiddenProducts,
      sellers: Number(sellers?.count ?? 0),
      reviews,
    };
  }

  async setStatus(
    sellerId: string,
    productId: string,
    status: ProductStatus,
  ): Promise<boolean> {
    // Условия владельца и текущего статуса входят в один атомарный ORM update.
    const result = await this.products.update(
      {
        id: productId,
        sellerId,
        status: Not("DELETED"),
      },
      { status },
    );
    return result.affected === 1;
  }

  private mapProduct(product: ProductEntity): ProductCard {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      category: {
        id: product.category.id,
        slug: product.category.slug,
        name: product.category.name,
      },
      seller: {
        id: product.seller.id,
        name: product.seller.name,
        rating: product.seller.rating,
        reviewCount: product.seller.reviewCount,
      },
      priceMinor: product.priceMinor,
      currency: "USD",
      rating: product.rating,
      reviewCount: product.reviewCount,
      salesCount: product.salesCount,
      imageUrl: product.imageUrl,
      inStock: product.stock > 0,
    };
  }

  private mapVariant(variant: ProductVariantEntity): ProductVariant {
    return {
      id: variant.id,
      slug: variant.slug,
      name: variant.name,
      value: variant.value,
      priceMinor: variant.priceMinor,
      stock: variant.stock,
      imageUrl: variant.imageUrl,
    };
  }

  private mapReview(review: ProductReviewEntity): ProductReview {
    return {
      id: review.id,
      authorName: review.authorName,
      authorAvatarUrl: review.authorAvatarUrl,
      rating: review.rating,
      text: review.reviewText,
      createdAt: review.createdAt.toISOString(),
    };
  }
}

function buildCategoryGraph(categories: CategoryEntity[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) {
      continue;
    }
    const group = children.get(category.parentId) ?? [];
    group.push(category.id);
    children.set(category.parentId, group);
  }

  return {
    depth(id: string): number {
      let depth = 0;
      let current = byId.get(id);
      const visited = new Set<string>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        depth += 1;
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return depth;
    },
    descendants(id: string): string[] {
      const result: string[] = [];
      const pending = [id];
      while (pending.length > 0) {
        const current = pending.shift();
        if (!current || result.includes(current)) {
          continue;
        }
        result.push(current);
        pending.push(...(children.get(current) ?? []));
      }
      return result;
    },
  };
}
