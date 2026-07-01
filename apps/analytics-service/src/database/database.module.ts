import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsEventEntity } from "./entities/analytics-event.entity";
import { InitialAnalyticsSchema1771400000000 } from "./migrations/initial-analytics-schema";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ??
        "postgresql://marketplace:marketplace@localhost:5432/analytics",
      entities: [AnalyticsEventEntity],
      synchronize: false,
      migrationsRun: true,
      migrations: [InitialAnalyticsSchema1771400000000],
      logging: false,
      extra: { max: 20, idleTimeoutMillis: 30_000 },
    }),
    TypeOrmModule.forFeature([AnalyticsEventEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
