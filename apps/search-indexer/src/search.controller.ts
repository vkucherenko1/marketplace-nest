import { Controller, Get, Post, Query } from "@nestjs/common";
import type { PaginatedResponse, ProductCard } from "@marketplace/contracts";
import { SearchService } from "./search.service";

@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("health")
  health(): { status: "ok"; service: "search-indexer" } {
    return { status: "ok", service: "search-indexer" };
  }

  @Post("search/reindex")
  reindex(): Promise<{ indexed: number; source: "catalog" }> {
    return this.search.reindex();
  }

  @Get("search/products")
  products(
    @Query() query: Record<string, string | string[]>,
  ): Promise<PaginatedResponse<ProductCard>> {
    return this.search.search(query);
  }
}
