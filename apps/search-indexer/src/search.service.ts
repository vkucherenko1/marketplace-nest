import { Injectable, Logger } from "@nestjs/common";
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

interface MeiliTask {
  taskUid: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly catalogUrl =
    process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";
  private readonly meiliUrl = process.env.MEILI_URL ?? "http://localhost:7700";
  private readonly index = process.env.MEILI_PRODUCTS_INDEX ?? "products";
  private readonly apiKey = process.env.MEILI_MASTER_KEY ?? "local-meili-master-key";
  private configurePromise: Promise<void> | null = null;
  private activeReindex: Promise<void> | null = null;

  async reindex(): Promise<{ indexed: number; source: "catalog" }> {
    const firstPage = await this.fetchCatalogPage(1);
    if (!this.activeReindex) {
      this.activeReindex = this.runReindex(firstPage)
        .catch((error) => {
          this.logger.error(
            `Background reindex failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        })
        .finally(() => {
          this.activeReindex = null;
        });
    }
    // Админский endpoint отвечает быстро, а тяжёлая индексация идёт в фоне.
    return { indexed: firstPage.total, source: "catalog" };
  }

  async syncProductDocument(event: {
    productId: string;
    status?: "ACTIVE" | "HIDDEN" | "DELETED";
    document?: ProductCard | null;
  }): Promise<void> {
    await this.ensureIndexConfigured();
    if (event.status === "HIDDEN" || event.status === "DELETED" || !event.document) {
      await this.deleteDocument(event.productId);
      return;
    }
    await this.addOrReplaceDocuments([event.document]);
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
    const tasks = (await Promise.all([
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
    ])) as MeiliTask[];
    for (const task of tasks) {
      await this.waitForTask(task.taskUid);
    }
  }

  private async ensureIndexConfigured(): Promise<void> {
    this.configurePromise ??= this.configureIndex().catch((error) => {
      this.configurePromise = null;
      throw error;
    });
    await this.configurePromise;
  }

  private async addOrReplaceDocuments(documents: ProductCard[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    const task = (await this.meili(`/indexes/${this.index}/documents?primaryKey=id`, {
      method: "POST",
      body: JSON.stringify(documents),
    })) as MeiliTask;
    await this.waitForTask(task.taskUid);
  }

  private async deleteDocument(productId: string): Promise<void> {
    const response = await fetch(`${this.meiliUrl}/indexes/${this.index}/documents/${productId}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (response.status === 404) {
      return;
    }
    if (!response.ok) {
      throw new Error(`Meilisearch delete failed: ${response.status}`);
    }
    const task = (await response.json()) as MeiliTask;
    await this.waitForTask(task.taskUid);
  }

  private async waitForTask(taskUid: number): Promise<void> {
    const deadline = Date.now() + Number(process.env.MEILI_TASK_TIMEOUT_MS ?? 15_000);
    while (Date.now() < deadline) {
      const task = (await this.meili(`/tasks/${taskUid}`, {
        method: "GET",
      })) as { status: string; error?: { message?: string } };
      if (task.status === "succeeded") {
        return;
      }
      if (task.status === "failed" || task.status === "canceled") {
        throw new Error(task.error?.message ?? `Meilisearch task ${taskUid} failed`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Meilisearch task ${taskUid} timed out`);
  }

  private async runReindex(
    firstPage: PaginatedResponse<ProductCard>,
  ): Promise<void> {
    await this.ensureIndexConfigured();
    const documents = [...firstPage.items];
    for (let pageNumber = 2; pageNumber <= firstPage.totalPages; pageNumber += 1) {
      const page = await this.fetchCatalogPage(pageNumber);
      documents.push(...page.items);
    }
    await this.addOrReplaceDocuments(documents);
  }

  private async fetchCatalogPage(
    pageNumber: number,
  ): Promise<PaginatedResponse<ProductCard>> {
    const response = await fetch(
      `${this.catalogUrl}/v1/products?page=${pageNumber}&pageSize=100&sort=sales`,
    );
    return (await response.json()) as PaginatedResponse<ProductCard>;
  }
}
