import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@marketplace/contracts";
import type { Request } from "express";

export interface AuthRequest extends Request {
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
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("Access token required");
    }
    try {
      const payload = await this.jwt.verifyAsync<AuthRequest["user"]>(token, {
        secret:
          process.env.JWT_ACCESS_SECRET ??
          "local-access-secret-change-me-32-chars",
      });
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
