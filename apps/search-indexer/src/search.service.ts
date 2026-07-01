import { Injectable } from "@nestjs/common";
import type {
  PageSize,
  PaginatedResponse,
  ProductCard,
} from "@marketplace/contracts";

interface MeiliSearchResponse {
  hits: ProductCard[];
  totalHits?: number;
  estimatedTotalHits?: number;
}

@Injectable()
export class SearchService {
  private readonly catalogUrl =
    process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";
  private readonly meiliUrl = process.env.MEILI_URL ?? "http://localhost:7700";
  private readonly index = process.env.MEILI_PRODUCTS_INDEX ?? "products";
  private readonly apiKey = process.env.MEILI_MASTER_KEY ?? "local-meili-master-key";

  async reindex(): Promise<{ indexed: number; source: "catalog" }> {
    await this.configureIndex();
    const response = await fetch(
      `${this.catalogUrl}/v1/products?page=1&pageSize=100&sort=sales`,
    );
    const page = (await response.json()) as PaginatedResponse<ProductCard>;
    await this.meili(`/indexes/${this.index}/documents?primaryKey=id`, {
      method: "POST",
      body: JSON.stringify(page.items),
    });
    // Индекс хранит только поисковую проекцию. Основная истина остается в catalog DB.
    return { indexed: page.items.length, source: "catalog" };
  }

  async search(
    query: Record<string, string | string[]>,
  ): Promise<PaginatedResponse<ProductCard>> {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20) as PageSize;
    const searchText = String(query.search ?? "");
    try {
      const result = (await this.meili(`/indexes/${this.index}/search`, {
        method: "POST",
        body: JSON.stringify({
          q: searchText,
          offset: (page - 1) * pageSize,
          limit: pageSize,
          ...(query.category
            ? { filter: [`category.slug = ${JSON.stringify(query.category)}`] }
            : {}),
          ...(query.sort === "price_asc"
            ? { sort: ["priceMinor:asc"] }
            : query.sort === "price_desc"
              ? { sort: ["priceMinor:desc"] }
              : query.sort === "rating"
                ? { sort: ["rating:desc"] }
                : query.sort === "sales"
                  ? { sort: ["salesCount:desc"] }
                  : {}),
        }),
      })) as MeiliSearchResponse;
      const total = result.totalHits ?? result.estimatedTotalHits ?? result.hits.length;
      return {
        items: result.hits,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    } catch {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, item));
        } else {
          params.set(key, value);
        }
      }
      const fallback = await fetch(`${this.catalogUrl}/v1/products?${params}`);
      return (await fallback.json()) as PaginatedResponse<ProductCard>;
    }
  }

  private async meili(path: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.meiliUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Meilisearch failed: ${response.status}`);
    }
    return response.json();
  }

  private async configureIndex(): Promise<void> {
    await Promise.all([
      this.meili(`/indexes/${this.index}/settings/searchable-attributes`, {
        method: "PUT",
        body: JSON.stringify(["name", "description", "category.name", "seller.name"]),
      }),
      this.meili(`/indexes/${this.index}/settings/filterable-attributes`, {
        method: "PUT",
        body: JSON.stringify(["category.id", "category.slug", "seller.id", "inStock"]),
      }),
      this.meili(`/indexes/${this.index}/settings/sortable-attributes`, {
        method: "PUT",
        body: JSON.stringify(["priceMinor", "rating", "salesCount", "reviewCount"]),
      }),
      this.meili(`/indexes/${this.index}/settings/ranking-rules`, {
        method: "PUT",
        body: JSON.stringify([
          "words",
          "typo",
          "proximity",
          "attribute",
          "sort",
          "exactness",
        ]),
      }),
    ]);
  }
}
