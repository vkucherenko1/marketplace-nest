import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@marketplace/contracts";
import type { FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    roles: UserRole[];
    sellerId: string | null;
    type: "access";
  };
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("Access token required");
    }
    try {
      // Каталог самостоятельно проверяет подпись JWT и не делает синхронный
      // запрос в auth-service на каждый вызов, что важно при высокой нагрузке.
      const payload = await this.jwt.verifyAsync<AuthenticatedRequest["user"]>(
        token,
        {
          secret:
            process.env.JWT_ACCESS_SECRET ??
            "local-access-secret-change-me-32-chars",
        },
      );
      if (payload.type !== "access") {
        throw new Error("Unexpected token type");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
