import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
  user: { sub: string; roles: string[] };
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing access token");
    }
    try {
      request.user = await this.jwt.verifyAsync(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
