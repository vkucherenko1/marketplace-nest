import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderLineEntity } from "./entities/order-line.entity";
import { OrderEntity } from "./entities/order.entity";
import { InitialOrderSchema1771300000000 } from "./migrations/initial-order-schema";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ??
        "postgresql://marketplace:marketplace@localhost:5432/orders",
      entities: [OrderEntity, OrderLineEntity],
      synchronize: false,
      migrationsRun: true,
      migrations: [InitialOrderSchema1771300000000],
      logging: false,
      extra: { max: 20, idleTimeoutMillis: 30_000 },
    }),
    TypeOrmModule.forFeature([OrderEntity, OrderLineEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
