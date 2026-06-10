import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  LoginResponse,
  UpdateUserProfile,
  UserProfile,
  UserSummary,
} from "@marketplace/contracts";
import { verify } from "@node-rs/argon2";
import { createHash, randomUUID } from "node:crypto";
import { UsersRepository, type UserRecord } from "../users/users.repository";

interface RefreshPayload {
  sub: string;
  sid: string;
  type: "refresh";
}

@Injectable()
export class AuthService {
  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET ?? "local-access-secret-change-me-32-chars";
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET ?? "local-refresh-secret-change-me-32-chars";

  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await verify(user.passwordHash, password))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.issueSession(user);
  }

  async refresh(token: string): Promise<LoginResponse> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return this.rotateSession(user, payload.sid, token);
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.refreshSecret,
      });
      await this.users.revokeSession(payload.sid);
    } catch {
      return;
    }
  }

  async profile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return this.toProfile(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateUserProfile,
  ): Promise<UserProfile> {
    const user = await this.users.updateProfile(userId, input);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return this.toProfile(user);
  }

  private async issueSession(user: UserRecord): Promise<LoginResponse> {
    // В БД хранится только хеш refresh-токена: утечка таблицы сессий
    // не даст злоумышленнику готовые токены для входа.
    const sessionId = randomUUID();
    const response = await this.buildTokens(user, sessionId);
    await this.users.createSession({
      id: sessionId,
      userId: user.id,
      tokenHash: this.digest(response.refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return response;
  }

  private async rotateSession(
    user: UserRecord,
    sessionId: string,
    currentToken: string,
  ): Promise<LoginResponse> {
    // Каждый refresh-токен одноразовый. Повторное применение считается
    // возможной кражей сессии и приводит к её отзыву.
    const response = await this.buildTokens(user, sessionId);
    const rotated = await this.users.rotateSession(
      sessionId,
      this.digest(currentToken),
      this.digest(response.refreshToken),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );
    if (!rotated) {
      await this.users.revokeSession(sessionId);
      throw new UnauthorizedException("Refresh token was already used");
    }
    return response;
  }

  private async buildTokens(
    user: UserRecord,
    sessionId: string,
  ): Promise<LoginResponse> {
    const userSummary: UserSummary = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
    };
    // Access-токен короткоживущий и содержит только данные, необходимые guards.
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        roles: user.roles,
        sellerId: user.sellerId,
        type: "access",
      },
      { secret: this.accessSecret, expiresIn: "15m" },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, type: "refresh" },
      { secret: this.refreshSecret, expiresIn: "30d" },
    );
    return {
      user: userSummary,
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private toProfile(user: UserRecord): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      birthDate: user.birthDate,
      phone: user.phone,
      gender: user.gender,
      city: user.city,
      address: user.address,
    };
  }
}
