import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type {
  Category,
  LoginResponse,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  SaveCategory,
  UserProfile,
} from "@marketplace/contracts";
import { ServiceProxy } from "./service-proxy.service";

@Controller()
export class GatewayController {
  private readonly authUrl =
    process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
  private readonly catalogUrl =
    process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";

  constructor(private readonly proxy: ServiceProxy) {}

  @Get("health")
  health(): { status: "ok"; service: "api-gateway" } {
    return { status: "ok", service: "api-gateway" };
  }

  @Post("auth/login")
  login(@Body() body: unknown): Promise<LoginResponse> {
    return this.proxy.request(this.authUrl, "auth/login", {
      method: "POST",
      body,
    });
  }

  @Post("auth/refresh")
  refresh(@Body() body: unknown): Promise<LoginResponse> {
    return this.proxy.request(this.authUrl, "auth/refresh", {
      method: "POST",
      body,
    });
  }

  @Post("auth/logout")
  @HttpCode(204)
  logout(@Body() body: unknown): Promise<void> {
    return this.proxy.request(this.authUrl, "auth/logout", {
      method: "POST",
      body,
    });
  }

  @Get("auth/profile")
  profile(
    @Headers("authorization") authorization: string | undefined,
  ): Promise<UserProfile> {
    return this.proxy.request(this.authUrl, "auth/profile", {
      ...(authorization ? { authorization } : {}),
    });
  }

  @Patch("auth/profile")
  updateProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<UserProfile> {
    return this.proxy.request(this.authUrl, "auth/profile", {
      method: "PATCH",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Get("categories")
  categories(): Promise<Category[]> {
    return this.proxy.request(this.catalogUrl, "categories");
  }

  @Post("moderation/categories")
  createCategory(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: SaveCategory,
  ): Promise<Category> {
    return this.proxy.request(this.catalogUrl, "moderation/categories", {
      method: "POST",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Patch("moderation/categories/:id")
  updateCategory(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: SaveCategory,
  ): Promise<Category> {
    return this.proxy.request(this.catalogUrl, `moderation/categories/${id}`, {
      method: "PATCH",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Delete("moderation/categories/:id")
  @HttpCode(204)
  deleteCategory(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ): Promise<void> {
    return this.proxy.request(this.catalogUrl, `moderation/categories/${id}`, {
      method: "DELETE",
      ...(authorization ? { authorization } : {}),
    });
  }

  @Get("products")
  products(
    @Query() query: Record<string, string | string[]>,
  ): Promise<PaginatedResponse<ProductCard>> {
    // URLSearchParams кодирует пользовательские фильтры и не позволяет
    // случайно собрать некорректную query string вручную.
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    }
    return this.proxy.request(this.catalogUrl, `products?${params.toString()}`);
  }

  @Get("products/:slug")
  product(@Param("slug") slug: string): Promise<ProductDetail> {
    return this.proxy.request(this.catalogUrl, `products/${slug}`);
  }

  @Post("seller/products")
  createProduct(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<{ id: string; slug: string }> {
    return this.proxy.request(this.catalogUrl, "seller/products", {
      method: "POST",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Patch("seller/products/:id/:action")
  @HttpCode(204)
  updateProductStatus(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("action") action: "hide" | "restore",
  ): Promise<void> {
    return this.proxy.request(
      this.catalogUrl,
      `seller/products/${id}/${action}`,
      {
        method: "PATCH",
        ...(authorization ? { authorization } : {}),
      },
    );
  }

  @Delete("seller/products/:id")
  @HttpCode(204)
  deleteProduct(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ): Promise<void> {
    return this.proxy.request(this.catalogUrl, `seller/products/${id}`, {
      method: "DELETE",
      ...(authorization ? { authorization } : {}),
    });
  }
}
