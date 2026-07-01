import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "../common/access-token.guard";
import { NatsEventPublisher } from "../common/nats-event-publisher";
import { DatabaseModule } from "../database/database.module";
import { CatalogController } from "./catalog.controller";
import { CatalogRepository } from "./catalog.repository";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [CatalogController],
  providers: [CatalogRepository, CatalogService, AccessTokenGuard, NatsEventPublisher],
})
export class CatalogModule {}
