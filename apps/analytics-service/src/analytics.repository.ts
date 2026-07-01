import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import type { AnalyticsEvent, SellerAnalytics } from "@marketplace/contracts";
import { LessThan, Repository } from "typeorm";
import { AnalyticsEventEntity } from "./database/entities/analytics-event.entity";

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectRepository(AnalyticsEventEntity)
    private readonly events: Repository<AnalyticsEventEntity>,
  ) {}

  async record(event: AnalyticsEvent): Promise<void> {
    await this.events.save(
      this.events.create({
        id: randomUUID(),
        name: event.name,
        orderId: event.orderId ?? null,
        productId: event.productId ?? null,
        sellerId: event.sellerId ?? null,
        categoryId: event.categoryId ?? null,
        searchQuery: event.searchQuery ?? null,
        position: event.position ?? null,
        quantity: event.quantity ?? 1,
        ...(event.occurredAt ? { createdAt: new Date(event.occurredAt) } : {}),
      }),
    );
  }

  async enforceRetention(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000);
    const result = await this.events.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  async sellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    const rows = await this.events.find({
      where: { sellerId },
      order: { createdAt: "DESC" },
    });
    const productStats = new Map<
      string,
      { productId: string; views: number; addToCart: number; purchases: number }
    >();
    for (const event of rows) {
      if (!event.productId) continue;
      const stats =
        productStats.get(event.productId) ??
        { productId: event.productId, views: 0, addToCart: 0, purchases: 0 };
      if (event.name === "PRODUCT_VIEW") stats.views += 1;
      if (event.name === "ADD_TO_CART") stats.addToCart += event.quantity;
      if (event.name === "CHECKOUT_CREATED") stats.purchases += event.quantity;
      productStats.set(event.productId, stats);
    }
    return {
      sellerId,
      productViews: rows.filter((event) => event.name === "PRODUCT_VIEW").length,
      searchImpressions: rows.filter(
        (event) => event.name === "SEARCH_RESULT_IMPRESSION",
      ).length,
      addToCart: rows
        .filter((event) => event.name === "ADD_TO_CART")
        .reduce((sum, event) => sum + event.quantity, 0),
      purchases: rows
        .filter((event) => event.name === "CHECKOUT_CREATED")
        .reduce((sum, event) => sum + event.quantity, 0),
      topProducts: [...productStats.values()].sort(
        (left, right) =>
          right.views + right.addToCart + right.purchases -
          (left.views + left.addToCart + left.purchases),
      ),
    };
  }
}
