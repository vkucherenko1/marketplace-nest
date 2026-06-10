import {
  Body,
  Controller,
  Delete,
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
  Category,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
} from "@marketplace/contracts";
import {
  AccessTokenGuard,
  type AuthenticatedRequest,
} from "../common/access-token.guard";
import { CatalogService } from "./catalog.service";
import { CreateProductDto, ProductListQueryDto, SaveCategoryDto } from "./dto";

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("health")
  health(): { status: "ok"; service: "catalog" } {
    return { status: "ok", service: "catalog" };
  }

  @Get("categories")
  categories(): Promise<Category[]> {
    return this.catalog.categories();
  }

  @Post("moderation/categories")
  @UseGuards(AccessTokenGuard)
  createCategory(
    @Req() request: AuthenticatedRequest,
    @Body() input: SaveCategoryDto,
  ): Promise<Category> {
    return this.catalog.createCategory(request.user, input);
  }

  @Patch("moderation/categories/:id")
  @UseGuards(AccessTokenGuard)
  updateCategory(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: SaveCategoryDto,
  ): Promise<Category> {
    return this.catalog.updateCategory(request.user, id, input);
  }

  @Delete("moderation/categories/:id")
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  deleteCategory(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.catalog.deleteCategory(request.user, id);
  }

  @Get("products")
  products(
    @Query() query: ProductListQueryDto,
  ): Promise<PaginatedResponse<ProductCard>> {
    return this.catalog.products(query);
  }

  @Get("products/:slug")
  product(@Param("slug") slug: string): Promise<ProductDetail> {
    return this.catalog.product(slug);
  }

  @Post("seller/products")
  @UseGuards(AccessTokenGuard)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateProductDto,
  ): Promise<{ id: string; slug: string }> {
    return this.catalog.create(request.user, input);
  }

  @Patch("seller/products/:id/hide")
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  hide(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.catalog.changeStatus(request.user, id, "HIDDEN");
  }

  @Patch("seller/products/:id/restore")
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  restore(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.catalog.changeStatus(request.user, id, "ACTIVE");
  }

  @Delete("seller/products/:id")
  @UseGuards(AccessTokenGuard)
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.catalog.changeStatus(request.user, id, "DELETED");
  }
}
