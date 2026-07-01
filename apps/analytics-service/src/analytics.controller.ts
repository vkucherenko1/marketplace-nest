import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AnalyticsEvent, SellerAnalytics } from "@marketplace/contracts";
import { AccessTokenGuard } from "./common/access-token.guard";
import { AnalyticsService } from "./analytics.service";

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("health")
  health(): { status: "ok"; service: "analytics-service" } {
    return { status: "ok", service: "analytics-service" };
  }

  @Post("analytics/events")
  record(@Body() body: AnalyticsEvent): Promise<{ accepted: true }> {
    return this.analytics.record(body);
  }

  @Get("analytics/sellers/:sellerId")
  @UseGuards(AccessTokenGuard)
  seller(@Param("sellerId") sellerId: string): Promise<SellerAnalytics> {
    return this.analytics.sellerAnalytics(sellerId);
  }
}
