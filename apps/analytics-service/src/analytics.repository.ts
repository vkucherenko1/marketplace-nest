import { Inject, Injectable } from "@nestjs/common";
import type { ClickHouseClient } from "@clickhouse/client";
import { randomUUID } from "node:crypto";
import type { AnalyticsEvent, SellerAnalytics } from "@marketplace/contracts";
import { CLICKHOUSE_CLIENT } from "./database/clickhouse.constants";

@Injectable()
export class AnalyticsRepository {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly client: ClickHouseClient,
  ) {}

  async record(event: AnalyticsEvent): Promise<void> {
    await this.client.insert({
      table: `${process.env.CLICKHOUSE_DATABASE ?? "analytics"}.analytics_events`,
      format: "JSONEachRow",
      values: [
        {
          id: randomUUID(),
          name: event.name,
          order_id: event.orderId ?? "",
          product_id: event.productId ?? "",
          seller_id: event.sellerId ?? "",
          category_id: event.categoryId ?? "",
          search_query: event.searchQuery ?? "",
          position: event.position ?? null,
          quantity: event.quantity ?? 1,
          created_at: this.toClickHouseDateTime(event.occurredAt),
        },
      ],
    });
  }

  async enforceRetention(days: number): Promise<number> {
    void days;
    // За retention отвечает TTL на таблице ClickHouse, поэтому вручную
    // чистить события на каждом запросе больше не нужно.
    return 0;
  }

  async sellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    const database = process.env.CLICKHOUSE_DATABASE ?? "analytics";
    const summaryResult = await this.client.query({
      query: `
        SELECT
          countIf(name = 'PRODUCT_VIEW') AS productViews,
          countIf(name = 'SEARCH_RESULT_IMPRESSION') AS searchImpressions,
          sumIf(quantity, name = 'ADD_TO_CART') AS addToCart,
          sumIf(quantity, name = 'CHECKOUT_CREATED') AS purchases
        FROM ${database}.analytics_events
        WHERE seller_id = {sellerId:String}
      `,
      query_params: { sellerId },
      format: "JSONEachRow",
    });
    const [summary] = await summaryResult.json<{
      productViews?: string | number;
      searchImpressions?: string | number;
      addToCart?: string | number | null;
      purchases?: string | number | null;
    }>();

    const topProductsResult = await this.client.query({
      query: `
        SELECT
          product_id AS productId,
          countIf(name = 'PRODUCT_VIEW') AS views,
          sumIf(quantity, name = 'ADD_TO_CART') AS addToCart,
          sumIf(quantity, name = 'CHECKOUT_CREATED') AS purchases
        FROM ${database}.analytics_events
        WHERE seller_id = {sellerId:String}
          AND product_id != ''
        GROUP BY product_id
        ORDER BY (views + addToCart + purchases) DESC, productId ASC
        LIMIT 20
      `,
      query_params: { sellerId },
      format: "JSONEachRow",
    });
    const topProducts = await topProductsResult.json<{
      productId: string;
      views?: string | number;
      addToCart?: string | number | null;
      purchases?: string | number | null;
    }>();

    return {
      sellerId,
      productViews: Number(summary?.productViews ?? 0),
      searchImpressions: Number(summary?.searchImpressions ?? 0),
      addToCart: Number(summary?.addToCart ?? 0),
      purchases: Number(summary?.purchases ?? 0),
      topProducts: topProducts.map((row) => ({
        productId: row.productId,
        views: Number(row.views ?? 0),
        addToCart: Number(row.addToCart ?? 0),
        purchases: Number(row.purchases ?? 0),
      })),
    };
  }

  async ping(): Promise<boolean> {
    const result = await this.client.ping();
    return result.success;
  }

  private toClickHouseDateTime(occurredAt?: string): string {
    const date = occurredAt ? new Date(occurredAt) : new Date();
    return date.toISOString().replace("T", " ").replace("Z", "");
  }
}
