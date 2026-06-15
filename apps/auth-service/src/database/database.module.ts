import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseService } from "./database.service";
import { RefreshSessionEntity } from "./entities/refresh-session.entity";
import { UserEntity } from "./entities/user.entity";
import { InitialAuthSchema1770800000000 } from "./migrations/initial-auth-schema";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url:
        process.env.DATABASE_URL ??
        "postgresql://marketplace:marketplace@localhost:5432/auth",
      entities: [UserEntity, RefreshSessionEntity],
      synchronize: false,
      migrationsRun: true,
      migrations: [InitialAuthSchema1770800000000],
      logging: false,
      extra: {
        max: 20,
        idleTimeoutMillis: 30_000,
      },
    }),
    TypeOrmModule.forFeature([UserEntity, RefreshSessionEntity]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
