import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "./common/access-token.guard";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsEventSubscriber } from "./analytics-event-subscriber";
import { AnalyticsRepository } from "./analytics.repository";
import { AnalyticsService } from "./analytics.service";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "local-access-secret-change-me-32-chars",
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AccessTokenGuard,
    AnalyticsRepository,
    AnalyticsService,
    AnalyticsEventSubscriber,
  ],
})
export class AppModule {}
