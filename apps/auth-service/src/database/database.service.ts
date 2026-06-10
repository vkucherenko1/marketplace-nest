import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import { Pool } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
  });

  async onModuleInit(): Promise<void> {
    // Для локального preview схема создаётся при старте. В production это заменяется
    // версионируемыми миграциями, которые запускаются отдельно от приложения.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text UNIQUE NOT NULL,
        display_name text NOT NULL,
        password_hash text NOT NULL,
        roles text[] NOT NULL,
        seller_id text,
        first_name text NOT NULL DEFAULT '',
        last_name text NOT NULL DEFAULT '',
        middle_name text,
        birth_date date,
        phone text,
        gender text,
        city text,
        address text,
        avatar_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date date;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS refresh_sessions_user_idx
        ON refresh_sessions(user_id, revoked_at);
    `);

    // Демо-пользователи позволяют сразу проверить все роли после docker compose up.
    const passwordHash = await hash("Marketplace123!");
    const users = [
      ["00000000-0000-4000-8000-000000000001", "admin@market.local", "Администратор", ["ADMIN"], null, "Администратор", "Системы"],
      ["00000000-0000-4000-8000-000000000002", "moderator@market.local", "Модератор", ["MODERATOR"], null, "Мария", "Модератор"],
      ["00000000-0000-4000-8000-000000000003", "buyer@market.local", "Анна Покупатель", ["BUYER"], null, "Анна", "Покупатель"],
      ["00000000-0000-4000-8000-000000000004", "seller1@market.local", "TechNova", ["SELLER"], "seller-1", "Иван", "Продавец"],
    ] as const;

    for (const [id, email, displayName, roles, sellerId, firstName, lastName] of users) {
      await this.pool.query(
        `INSERT INTO users (
           id, email, display_name, password_hash, roles, seller_id,
           first_name, last_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE SET
           first_name = CASE WHEN users.first_name = '' THEN EXCLUDED.first_name ELSE users.first_name END,
           last_name = CASE WHEN users.last_name = '' THEN EXCLUDED.last_name ELSE users.last_name END`,
        [id, email, displayName, passwordHash, roles, sellerId, firstName, lastName],
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
