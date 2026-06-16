import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type {
  LoginResponse,
  ManagedUser,
  PaginatedResponse,
  UserProfile,
} from "@marketplace/contracts";
import { AccessTokenGuard, type AuthRequest } from "./access-token.guard";
import { AuthService } from "./auth.service";
import {
  AdminUsersQueryDto,
  LoginDto,
  RefreshDto,
  UpdateProfileDto,
  UpdateUserRolesDto,
} from "./dto";
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("health")
  health(): { status: "ok"; service: "auth" } {
    return { status: "ok", service: "auth" };
  }

  @Post("auth/login")
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("auth/refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<LoginResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("auth/logout")
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get("auth/profile")
  @UseGuards(AccessTokenGuard)
  profile(@Req() request: AuthRequest): Promise<UserProfile> {
    return this.auth.profile(request.user.sub);
  }

  @Patch("auth/profile")
  @UseGuards(AccessTokenGuard)
  updateProfile(
    @Req() request: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.auth.updateProfile(request.user.sub, dto);
  }

  @Get("admin/users")
  @UseGuards(AccessTokenGuard)
  adminUsers(
    @Req() request: AuthRequest,
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedResponse<ManagedUser>> {
    return this.auth.adminUsers(request.user, query.page, query.pageSize);
  }

  @Patch("admin/users/:id/roles")
  @UseGuards(AccessTokenGuard)
  updateUserRoles(
    @Req() request: AuthRequest,
    @Param("id") id: string,
    @Body() dto: UpdateUserRolesDto,
  ): Promise<ManagedUser> {
    return this.auth.updateUserRoles(request.user, id, dto.roles);
  }
}
