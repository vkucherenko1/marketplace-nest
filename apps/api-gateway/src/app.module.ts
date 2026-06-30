import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { seconds, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { GatewayModule } from "./gateway.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        // Глобальный лимит защищает публичный API от случайных всплесков
        // и простого brute-force до появления внешнего WAF/API gateway.
        ttl: seconds(Number(process.env.RATE_LIMIT_TTL_SECONDS ?? 60)),
        limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 180),
      },
    ]),
    GatewayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
