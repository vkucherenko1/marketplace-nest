import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type {
  Category,
  CheckoutRequest,
  MediaUploadRequest,
  MediaUploadTicket,
  LoginResponse,
  ManagedUser,
  OrderSummary,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductReviewsResponse,
  PlatformOverview,
  SellerProduct,
  SellerAnalytics,
  SaveCategory,
  UserProfile,
  UserRole,
  AnalyticsEvent,
} from "@marketplace/contracts";
import { ServiceProxy } from "./service-proxy.service";

@Controller()
export class GatewayController {
  private readonly authUrl =
    process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
  private readonly catalogUrl =
    process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";
  private readonly orderUrl =
    process.env.ORDER_SERVICE_URL ?? "http://localhost:3003";
  private readonly mediaUrl =
    process.env.MEDIA_SERVICE_URL ?? "http://localhost:3004";
  private readonly searchUrl =
    process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005";
  private readonly analyticsUrl =
    process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3006";

  constructor(private readonly proxy: ServiceProxy) {}

  @Get("health")
  health(): { status: "ok"; service: "api-gateway" } {
    return { status: "ok", service: "api-gateway" };
  }

  @Get("metrics")
  @Header("content-type", "text/plain; version=0.0.4")
  metrics(): string {
    const memory = process.memoryUsage();
    // Минимальный Prometheus-compatible endpoint для локального compose.
    // В production сюда обычно добавляют request counters/histograms.
    return [
      "# HELP marketplace_gateway_uptime_seconds Gateway process uptime.",
      "# TYPE marketplace_gateway_uptime_seconds gauge",
      `marketplace_gateway_uptime_seconds ${process.uptime().toFixed(0)}`,
      "# HELP marketplace_gateway_heap_used_bytes Gateway heap used bytes.",
      "# TYPE marketplace_gateway_heap_used_bytes gauge",
      `marketplace_gateway_heap_used_bytes ${memory.heapUsed}`,
      "",
    ].join("\n");
  }

  @Post("auth/login")
  @HttpCode(200)
  login(@Body() body: unknown): Promise<LoginResponse> {
    return this.proxy.request(this.authUrl, "auth/login", {
      method: "POST",
      body,
    });
  }

  @Post("auth/refresh")
  @HttpCode(200)
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

  @Get("admin/users")
  adminUsers(
    @Headers("authorization") authorization: string | undefined,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ): Promise<PaginatedResponse<ManagedUser>> {
    const params = new URLSearchParams({ page, pageSize });
    return this.proxy.request(this.authUrl, `admin/users?${params}`, {
      ...(authorization ? { authorization } : {}),
    });
  }

  @Patch("admin/users/:id/roles")
  updateUserRoles(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { roles: UserRole[] },
  ): Promise<ManagedUser> {
    return this.proxy.request(this.authUrl, `admin/users/${id}/roles`, {
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

  @Get("products/:slug/reviews")
  productReviews(
    @Param("slug") slug: string,
    @Query() query: Record<string, string>,
  ): Promise<ProductReviewsResponse> {
    const params = new URLSearchParams(query);
    return this.proxy.request(
      this.catalogUrl,
      `products/${slug}/reviews?${params.toString()}`,
    );
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

  @Get("seller/products")
  sellerProducts(
    @Headers("authorization") authorization: string | undefined,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ): Promise<PaginatedResponse<SellerProduct>> {
    const params = new URLSearchParams({ page, pageSize });
    return this.proxy.request(this.catalogUrl, `seller/products?${params}`, {
      ...(authorization ? { authorization } : {}),
    });
  }

  @Get("moderation/overview")
  overview(
    @Headers("authorization") authorization: string | undefined,
  ): Promise<PlatformOverview> {
    return this.proxy.request(this.catalogUrl, "moderation/overview", {
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

  @Post("checkout")
  checkout(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: CheckoutRequest,
  ): Promise<OrderSummary> {
    return this.proxy.request(this.orderUrl, "checkout", {
      method: "POST",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Get("orders")
  orders(
    @Headers("authorization") authorization: string | undefined,
  ): Promise<OrderSummary[]> {
    return this.proxy.request(this.orderUrl, "orders", {
      ...(authorization ? { authorization } : {}),
    });
  }

  @Get("orders/:id")
  order(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ): Promise<OrderSummary> {
    return this.proxy.request(this.orderUrl, `orders/${id}`, {
      ...(authorization ? { authorization } : {}),
    });
  }

  @Post("media/uploads/sign")
  signUpload(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: MediaUploadRequest,
  ): Promise<MediaUploadTicket> {
    return this.proxy.request(this.mediaUrl, "media/uploads/sign", {
      method: "POST",
      body,
      ...(authorization ? { authorization } : {}),
    });
  }

  @Post("search/reindex")
  reindexSearch(): Promise<{ indexed: number; source: "catalog" }> {
    return this.proxy.request(this.searchUrl, "search/reindex", {
      method: "POST",
    });
  }

  @Get("search/products")
  searchProducts(
    @Query() query: Record<string, string | string[]>,
  ): Promise<PaginatedResponse<ProductCard>> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value !== undefined) {
        params.set(key, value);
      }
    }
    return this.proxy.request(this.searchUrl, `search/products?${params}`);
  }

  @Post("analytics/events")
  recordAnalytics(@Body() body: AnalyticsEvent): Promise<{ accepted: true }> {
    return this.proxy.request(this.analyticsUrl, "analytics/events", {
      method: "POST",
      body,
    });
  }

  @Get("analytics/sellers/:sellerId")
  sellerAnalytics(
    @Headers("authorization") authorization: string | undefined,
    @Param("sellerId") sellerId: string,
  ): Promise<SellerAnalytics> {
    return this.proxy.request(this.analyticsUrl, `analytics/sellers/${sellerId}`, {
      ...(authorization ? { authorization } : {}),
    });
  }
}
