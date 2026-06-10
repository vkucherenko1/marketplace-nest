import { Injectable } from "@nestjs/common";
import type {
  Category,
  PageSize,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductReview,
  ProductSort,
  ProductVariant,
  SaveCategory,
} from "@marketplace/contracts";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  seller_id: string;
  seller_name: string;
  seller_rating: string;
  seller_review_count: number;
  price_minor: number;
  rating: string;
  review_count: number;
  image_url: string;
  stock: number;
}

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: DatabaseService) {}

  async listCategories(): Promise<Category[]> {
    const result = await this.database.pool.query<{
      id: string;
      slug: string;
      name: string;
      parent_id: string | null;
      depth: number;
      product_count: string;
    }>(`
      WITH RECURSIVE category_tree AS (
        SELECT id, slug, name, parent_id, 1 AS depth
        FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.slug, c.name, c.parent_id, tree.depth + 1
        FROM categories c
        JOIN category_tree tree ON tree.id = c.parent_id
      ),
      category_closure AS (
        SELECT id AS ancestor_id, id AS descendant_id FROM categories
        UNION ALL
        SELECT closure.ancestor_id, child.id
        FROM category_closure closure
        JOIN categories child ON child.parent_id = closure.descendant_id
      )
      SELECT tree.id, tree.slug, tree.name, tree.parent_id, tree.depth,
             count(p.id)::text AS product_count
      FROM category_tree tree
      JOIN category_closure closure ON closure.ancestor_id = tree.id
      LEFT JOIN products p
        ON p.category_id = closure.descendant_id AND p.status = 'ACTIVE'
      GROUP BY tree.id, tree.slug, tree.name, tree.parent_id, tree.depth
      ORDER BY tree.depth, tree.name
    `);
    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      parentId: row.parent_id,
      depth: row.depth,
      productCount: Number(row.product_count),
    }));
  }

  async createCategory(input: SaveCategory): Promise<Category> {
    const id = randomUUID();
    await this.database.pool.query(
      `INSERT INTO categories (id, slug, name, parent_id) VALUES ($1, $2, $3, $4)`,
      [id, input.slug, input.name, input.parentId],
    );
    return {
      id,
      ...input,
      depth: await this.categoryDepth(id),
      productCount: 0,
    };
  }

  async categorySlugExists(slug: string, exceptId?: string): Promise<boolean> {
    const result = await this.database.pool.query(
      `SELECT 1 FROM categories WHERE slug = $1 AND ($2::text IS NULL OR id <> $2)`,
      [slug, exceptId ?? null],
    );
    return result.rowCount === 1;
  }

  async updateCategory(id: string, input: SaveCategory): Promise<Category | null> {
    const result = await this.database.pool.query(
      `UPDATE categories SET slug = $2, name = $3, parent_id = $4 WHERE id = $1`,
      [id, input.slug, input.name, input.parentId],
    );
    if (result.rowCount !== 1) {
      return null;
    }
    const category = (await this.listCategories()).find((item) => item.id === id);
    return category ?? null;
  }

  async deleteCategory(id: string): Promise<"deleted" | "not_found" | "not_empty"> {
    const result = await this.database.pool.query<{ child_count: string; product_count: string }>(
      `SELECT
         (SELECT count(*) FROM categories WHERE parent_id = $1)::text AS child_count,
         (SELECT count(*) FROM products WHERE category_id = $1)::text AS product_count
       WHERE EXISTS (SELECT 1 FROM categories WHERE id = $1)`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return "not_found";
    }
    if (Number(row.child_count) > 0 || Number(row.product_count) > 0) {
      return "not_empty";
    }
    await this.database.pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return "deleted";
  }

  async categoryDepth(id: string): Promise<number> {
    const result = await this.database.pool.query<{ depth: number }>(
      `WITH RECURSIVE ancestors AS (
         SELECT id, parent_id, 1 AS depth FROM categories WHERE id = $1
         UNION ALL
         SELECT c.id, c.parent_id, ancestors.depth + 1
         FROM categories c JOIN ancestors ON c.id = ancestors.parent_id
       )
       SELECT coalesce(max(depth), 0)::int AS depth FROM ancestors`,
      [id],
    );
    return result.rows[0]?.depth ?? 0;
  }

  async subtreeDepth(id: string): Promise<number> {
    const result = await this.database.pool.query<{ depth: number }>(
      `WITH RECURSIVE descendants AS (
         SELECT id, 1 AS depth FROM categories WHERE id = $1
         UNION ALL
         SELECT c.id, descendants.depth + 1
         FROM categories c JOIN descendants ON c.parent_id = descendants.id
       )
       SELECT coalesce(max(depth), 0)::int AS depth FROM descendants`,
      [id],
    );
    return result.rows[0]?.depth ?? 0;
  }

  async isInSubtree(rootId: string, candidateId: string): Promise<boolean> {
    const result = await this.database.pool.query(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM categories WHERE id = $1
         UNION ALL
         SELECT c.id FROM categories c JOIN descendants ON c.parent_id = descendants.id
       )
       SELECT 1 FROM descendants WHERE id = $2`,
      [rootId, candidateId],
    );
    return result.rowCount === 1;
  }

  async listProducts(input: {
    category?: string;
    search?: string;
    sort: ProductSort;
    page: number;
    pageSize: PageSize;
  }): Promise<PaginatedResponse<ProductCard>> {
    // Значения передаются параметрами PostgreSQL, а SQL-фрагменты сортировки
    // выбираются только из закрытого union-типа ProductSort.
    const values: unknown[] = [];
    const predicates = ["p.status = 'ACTIVE'"];
    let searchParameter: number | null = null;
    if (input.category) {
      values.push(input.category);
      predicates.push(`c.id IN (
        WITH RECURSIVE selected_categories AS (
          SELECT id FROM categories WHERE slug = $${values.length}
          UNION ALL
          SELECT child.id FROM categories child
          JOIN selected_categories parent ON child.parent_id = parent.id
        )
        SELECT id FROM selected_categories
      )`);
    }
    if (input.search) {
      values.push(`%${input.search}%`);
      searchParameter = values.length;
      predicates.push(
        `(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`,
      );
    }
    const where = predicates.join(" AND ");
    const orderBy: Record<ProductSort, string> = {
      relevance: searchParameter
        ? `CASE WHEN p.name ILIKE $${searchParameter} THEN 0 ELSE 1 END, p.rating DESC, p.id`
        : "p.rating DESC, p.review_count DESC, p.id",
      price_asc: "p.price_minor ASC, p.id",
      price_desc: "p.price_minor DESC, p.id",
      rating: "p.rating DESC, p.review_count DESC, p.id",
    };
    // Подсчёт и выборка разделены, чтобы клиент получил точное число страниц,
    // а сама пагинация выполнялась в БД, не в памяти приложения.
    const countResult = await this.database.pool.query<{ total: string }>(
      `SELECT count(*)::text AS total
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);
    values.push(input.pageSize, (input.page - 1) * input.pageSize);
    const result = await this.database.pool.query<ProductRow>(
      `SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.rating,
              p.review_count, p.image_url, p.stock,
              c.id AS category_id, c.slug AS category_slug, c.name AS category_name,
              s.id AS seller_id, s.name AS seller_name, s.rating AS seller_rating,
              s.review_count AS seller_review_count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN sellers s ON s.id = p.seller_id
       WHERE ${where}
       ORDER BY ${orderBy[input.sort]}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: result.rows.map((row) => this.mapProduct(row)),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async findProductBySlug(slug: string): Promise<ProductDetail | null> {
    const result = await this.database.pool.query<ProductRow>(
      `SELECT p.id, p.slug, p.name, p.description, p.price_minor, p.rating,
              p.review_count, p.image_url, p.stock,
              c.id AS category_id, c.slug AS category_slug, c.name AS category_name,
              s.id AS seller_id, s.name AS seller_name, s.rating AS seller_rating,
              s.review_count AS seller_review_count
       FROM products p
       JOIN categories c ON c.id = p.category_id
       JOIN sellers s ON s.id = p.seller_id
       WHERE p.slug = $1 AND p.status = 'ACTIVE'`,
      [slug],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    const [variants, reviews] = await Promise.all([
      this.listVariants(row.id),
      this.listReviews(row.id),
    ]);
    return { ...this.mapProduct(row), variants, reviews };
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
    await this.database.pool.query(
      `INSERT INTO products (
        id, slug, name, description, category_id, seller_id,
        price_minor, rating, review_count, image_url, stock, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,$9,'HIDDEN')`,
      [
        id,
        slug,
        input.name,
        input.description,
        input.categoryId,
        sellerId,
        input.priceMinor,
        input.imageUrl,
        input.stock,
      ],
    );
    return { id, slug };
  }

  async setStatus(
    sellerId: string,
    productId: string,
    status: "ACTIVE" | "HIDDEN" | "DELETED",
  ): Promise<boolean> {
    // seller_id входит в условие UPDATE: продавец физически не может изменить
    // чужой товар даже при подмене идентификатора в HTTP-запросе.
    const result = await this.database.pool.query(
      `UPDATE products SET status = $3, updated_at = now()
       WHERE id = $1 AND seller_id = $2 AND status <> 'DELETED'`,
      [productId, sellerId, status],
    );
    return result.rowCount === 1;
  }

  private mapProduct(row: ProductRow): ProductCard {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: {
        id: row.category_id,
        slug: row.category_slug,
        name: row.category_name,
      },
      seller: {
        id: row.seller_id,
        name: row.seller_name,
        rating: Number(row.seller_rating),
        reviewCount: row.seller_review_count,
      },
      priceMinor: row.price_minor,
      currency: "USD",
      rating: Number(row.rating),
      reviewCount: row.review_count,
      imageUrl: row.image_url,
      inStock: row.stock > 0,
    };
  }

  private async listVariants(productId: string): Promise<ProductVariant[]> {
    const result = await this.database.pool.query<{
      id: string;
      slug: string;
      name: string;
      value: string;
      price_minor: number;
      stock: number;
      image_url: string;
    }>(
      `SELECT id, slug, name, value, price_minor, stock, image_url
       FROM product_variants WHERE product_id = $1 ORDER BY price_minor, id`,
      [productId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      value: row.value,
      priceMinor: row.price_minor,
      stock: row.stock,
      imageUrl: row.image_url,
    }));
  }

  private async listReviews(productId: string): Promise<ProductReview[]> {
    const result = await this.database.pool.query<{
      id: string;
      author_name: string;
      author_avatar_url: string | null;
      rating: number;
      review_text: string;
      created_at: string;
    }>(
      `SELECT id, author_name, author_avatar_url, rating, review_text,
              created_at::text
       FROM product_reviews
       WHERE product_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [productId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      rating: row.rating,
      text: row.review_text,
      createdAt: row.created_at,
    }));
  }
}
