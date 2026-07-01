import { Injectable } from "@nestjs/common";
import type { AnalyticsEvent, SellerAnalytics } from "@marketplace/contracts";
import { AnalyticsRepository } from "./analytics.repository";

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async record(event: AnalyticsEvent): Promise<{ accepted: true }> {
    await this.repository.record(event);
    await this.repository.enforceRetention(
      Number(process.env.ANALYTICS_RETENTION_DAYS ?? 90),
    );
    return { accepted: true };
  }

  sellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    return this.repository.sellerAnalytics(sellerId);
  }
}
