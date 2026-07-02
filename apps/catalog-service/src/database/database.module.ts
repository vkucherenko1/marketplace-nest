import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseService } from "./database.service";
import { CategoryEntity } from "./entities/category.entity";
import { ProductReviewEntity } from "./entities/product-review.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { ProductEntity } from "./entities/product.entity";
import { InventoryReservationEntity } from "./entities/inventory-reservation.entity";
import { OutboxEventEntity } from "./entities/outbox-event.entity";
import { SellerEntity } from "./entities/seller.entity";
import { AddInventoryReservations1771200000000 } from "./migrations/add-inventory-reservations";
import { AddCatalogOutboxEvents1771400000000 } from "./migrations/add-outbox-events";
import { AddProductSalesCount1770900000000 } from "./migrations/add-product-sales-count";
import { InitialCatalogSchema1770800000000 } from "./migrations/initial-catalog-schema";
import { NormalizePicsumImageUrls1771000000000 } from "./migrations/normalize-picsum-image-urls";
import { ReplacePicsumImageUrls1771100000000 } from "./migrations/replace-picsum-image-urls";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ??
        "postgresql://marketplace:marketplace@localhost:5432/catalog",
      entities: [
        CategoryEntity,
        SellerEntity,
        ProductEntity,
        ProductVariantEntity,
        ProductReviewEntity,
        InventoryReservationEntity,
        OutboxEventEntity,
      ],
      synchronize: false,
      migrationsRun: true,
      migrations: [
        InitialCatalogSchema1770800000000,
        AddProductSalesCount1770900000000,
        NormalizePicsumImageUrls1771000000000,
        ReplacePicsumImageUrls1771100000000,
        AddInventoryReservations1771200000000,
        AddCatalogOutboxEvents1771400000000,
      ],
      logging: false,
      extra: {
        max: 30,
        idleTimeoutMillis: 30_000,
      },
    }),
    TypeOrmModule.forFeature([
      CategoryEntity,
      SellerEntity,
      ProductEntity,
      ProductVariantEntity,
      ProductReviewEntity,
      InventoryReservationEntity,
      OutboxEventEntity,
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
