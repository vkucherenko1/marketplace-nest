import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "./database/database.module";
import { InventoryClient } from "./inventory.client";
import { NatsEventPublisher } from "./nats-event-publisher";
import { OrderController } from "./order.controller";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";
import { AccessTokenGuard } from "./common/access-token.guard";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "local-access-secret-change-me-32-chars",
    }),
  ],
  controllers: [OrderController],
  providers: [
    OrderRepository,
    InventoryClient,
    NatsEventPublisher,
    OrderService,
    AccessTokenGuard,
  ],
})
export class AppModule {}
