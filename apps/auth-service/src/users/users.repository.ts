import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  UpdateUserProfile,
  UserProfile,
  UserRole,
} from "@marketplace/contracts";
import { IsNull, MoreThan, Repository } from "typeorm";
import { RefreshSessionEntity } from "../database/entities/refresh-session.entity";
import { UserEntity } from "../database/entities/user.entity";

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

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RefreshSessionEntity)
    private readonly sessions: Repository<RefreshSessionEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.findOneBy({ id });
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.sessions.save(this.sessions.create(input));
  }

  async rotateSession(
    id: string,
    currentHash: string,
    nextHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    // Условный UPDATE остаётся атомарным, но формируется TypeORM без ручного SQL.
    const result = await this.sessions.update(
      {
        id,
        tokenHash: currentHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      { tokenHash: nextHash, expiresAt },
    );
    return result.affected === 1;
  }

  async revokeSession(id: string): Promise<void> {
    await this.sessions.update({ id }, { revokedAt: new Date() });
  }

  async updateProfile(
    id: string,
    input: UpdateUserProfile,
  ): Promise<UserRecord | null> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      return null;
    }
    this.users.merge(user, {
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName ?? null,
      birthDate: input.birthDate ?? null,
      phone: input.phone ?? null,
      gender: input.gender ?? null,
      city: input.city ?? null,
      address: input.address ?? null,
      avatarUrl: input.avatarUrl ?? null,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
    });
    return this.users.save(user);
  }
}
