import { Injectable } from "@nestjs/common";
import type { UpdateUserProfile, UserProfile, UserRole } from "@marketplace/contracts";
import { DatabaseService } from "../database/database.service";

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  roles: UserRole[];
  sellerId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  phone: string | null;
  gender: UserProfile["gender"];
  city: string | null;
  address: string | null;
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  roles: UserRole[];
  seller_id: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  birth_date: string | null;
  phone: string | null;
  gender: UserProfile["gender"];
  city: string | null;
  address: string | null;
  avatar_url: string | null;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.database.pool.query<UserRow>(
      `SELECT id, email, display_name, password_hash, roles, seller_id,
              first_name, last_name, middle_name, birth_date::text, phone,
              gender, city, address, avatar_url
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    return row ? this.map(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.database.pool.query<UserRow>(
      `SELECT id, email, display_name, password_hash, roles, seller_id,
              first_name, last_name, middle_name, birth_date::text, phone,
              gender, city, address, avatar_url
       FROM users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.map(row) : null;
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.database.pool.query(
      `INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.id, input.userId, input.tokenHash, input.expiresAt],
    );
  }

  async rotateSession(
    id: string,
    currentHash: string,
    nextHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    // Атомарное сравнение текущего хеша не позволяет применить refresh-токен повторно.
    const result = await this.database.pool.query(
      `UPDATE refresh_sessions
       SET token_hash = $3, expires_at = $4
       WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
      [id, currentHash, nextHash, expiresAt],
    );
    return result.rowCount === 1;
  }

  async revokeSession(id: string): Promise<void> {
    await this.database.pool.query(
      "UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1",
      [id],
    );
  }

  async updateProfile(
    id: string,
    input: UpdateUserProfile,
  ): Promise<UserRecord | null> {
    const displayName = `${input.firstName} ${input.lastName}`.trim();
    await this.database.pool.query(
      `UPDATE users SET
         first_name = $2, last_name = $3, middle_name = $4,
         birth_date = $5, phone = $6, gender = $7, city = $8,
         address = $9, avatar_url = $10, display_name = $11
       WHERE id = $1`,
      [
        id,
        input.firstName,
        input.lastName,
        input.middleName ?? null,
        input.birthDate ?? null,
        input.phone ?? null,
        input.gender ?? null,
        input.city ?? null,
        input.address ?? null,
        input.avatarUrl ?? null,
        displayName,
      ],
    );
    return this.findById(id);
  }

  private map(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      roles: row.roles,
      sellerId: row.seller_id,
      firstName: row.first_name,
      lastName: row.last_name,
      middleName: row.middle_name,
      birthDate: row.birth_date,
      phone: row.phone,
      gender: row.gender,
      city: row.city,
      address: row.address,
      avatarUrl: row.avatar_url,
    };
  }
}
