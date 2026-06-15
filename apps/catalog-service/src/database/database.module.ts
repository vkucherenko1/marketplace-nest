import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseService } from "./database.service";
import { CategoryEntity } from "./entities/category.entity";
import { ProductReviewEntity } from "./entities/product-review.entity";
import { ProductVariantEntity } from "./entities/product-variant.entity";
import { ProductEntity } from "./entities/product.entity";
import { SellerEntity } from "./entities/seller.entity";
import { InitialCatalogSchema1770800000000 } from "./migrations/initial-catalog-schema";

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
      ],
      synchronize: false,
      migrationsRun: true,
      migrations: [InitialCatalogSchema1770800000000],
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
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
