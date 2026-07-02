import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Category,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductReviewsResponse,
  PlatformOverview,
  InventoryActionResponse,
  InventoryOrderRequest,
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
  ReserveInventoryResponse,
  SellerProduct,
  SaveCategory,
} from "@marketplace/contracts";
import type { AuthenticatedRequest } from "../common/access-token.guard";
import { CatalogRepository } from "./catalog.repository";
import { NatsEventPublisher } from "../common/nats-event-publisher";
import {
  CreateProductDto,
  ProductListQueryDto,
  ProductReviewsQueryDto,
  SaveCategoryDto,
  SellerProductsQueryDto,
} from "./dto";

@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly events: NatsEventPublisher,
  ) {}

  categories(): Promise<Category[]> {
    return this.repository.listCategories();
  }

  async createCategory(
    user: AuthenticatedRequest["user"],
    input: SaveCategoryDto,
  ): Promise<Category> {
    this.requireModerator(user);
    await this.validateCategoryPlacement(null, input);
    return this.repository.createCategory(input);
  }

  async updateCategory(
    user: AuthenticatedRequest["user"],
    id: string,
    input: SaveCategoryDto,
  ): Promise<Category> {
    this.requireModerator(user);
    await this.validateCategoryPlacement(id, input);
    const category = await this.repository.updateCategory(id, input);
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async deleteCategory(
    user: AuthenticatedRequest["user"],
    id: string,
  ): Promise<void> {
    this.requireModerator(user);
    const result = await this.repository.deleteCategory(id);
    if (result === "not_found") {
      throw new NotFoundException("Category not found");
    }
    if (result === "not_empty") {
      throw new ConflictException(
        "Сначала перенесите товары и удалите дочерние категории",
      );
    }
  }

  products(
    query: ProductListQueryDto,
  ): Promise<PaginatedResponse<ProductCard>> {
    return this.repository.listProducts(query);
  }

  async product(slug: string): Promise<ProductDetail> {
    const product = await this.repository.findProductBySlug(slug);
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async reviews(
    slug: string,
    query: ProductReviewsQueryDto,
  ): Promise<ProductReviewsResponse> {
    const reviews = await this.repository.listProductReviews(slug, query);
    if (!reviews) {
      throw new NotFoundException("Product not found");
    }
    return reviews;
  }

  async create(
    user: AuthenticatedRequest["user"],
    input: CreateProductDto,
  ): Promise<{ id: string; slug: string }> {
    const sellerId = this.requireSeller(user);
    // Новый товар всегда создаётся скрытым. Продавец должен отдельно проверить
    // карточку и вручную опубликовать её через операцию восстановления/активации.
    const created = await this.repository.createProduct(sellerId, input);
    await this.publishProductSnapshot(
      "marketplace.product.created",
      created.id,
      "HIDDEN",
    );
    return created;
  }

  sellerProducts(
    user: AuthenticatedRequest["user"],
    query: SellerProductsQueryDto,
  ): Promise<PaginatedResponse<SellerProduct>> {
    return this.repository.listSellerProducts(
      this.requireSeller(user),
      query.page,
      query.pageSize,
    );
  }

  overview(
    user: AuthenticatedRequest["user"],
  ): Promise<PlatformOverview> {
    this.requireModerator(user);
    return this.repository.platformOverview();
  }

  async changeStatus(
    user: AuthenticatedRequest["user"],
    id: string,
    status: "ACTIVE" | "HIDDEN" | "DELETED",
  ): Promise<void> {
    const sellerId = this.requireSeller(user);
    if (!(await this.repository.setStatus(sellerId, id, status))) {
      throw new NotFoundException("Product was not found or is not owned by seller");
    }
    await this.publishProductSnapshot("marketplace.product.updated", id, status);
  }

  async reserveInventory(
    internalToken: string | undefined,
    input: ReserveInventoryRequest,
  ): Promise<ReserveInventoryResponse> {
    this.requireInternalToken(internalToken);
    const reservation = await this.repository.reserveInventory(input);
    if (!reservation) {
      throw new ConflictException("Insufficient inventory");
    }
    return reservation;
  }

  async confirmInventory(
    internalToken: string | undefined,
    input: InventoryOrderRequest,
  ): Promise<InventoryActionResponse> {
    this.requireInternalToken(internalToken);
    const confirmed = await this.repository.confirmInventory(input);
    if (!confirmed) {
      throw new ConflictException("Reservation is missing or expired");
    }
    await this.events.publish("marketplace.inventory.confirmed", {
      orderId: input.orderId,
      affected: confirmed.affected,
      occurredAt: new Date().toISOString(),
    });
    for (const productId of confirmed.productIds ?? []) {
      await this.publishProductSnapshot("marketplace.product.updated", productId);
    }
    return confirmed;
  }

  async releaseInventory(
    internalToken: string | undefined,
    input: ReleaseInventoryRequest,
  ): Promise<InventoryActionResponse> {
    this.requireInternalToken(internalToken);
    const released = await this.repository.releaseInventory(input);
    if (!released) {
      throw new NotFoundException("Reservation not found");
    }
    await this.events.publish("marketplace.inventory.released", {
      orderId: input.orderId,
      affected: released.affected,
      reason: input.reason ?? "CANCELLED",
      occurredAt: new Date().toISOString(),
    });
    return released;
  }

  async expireInventory(
    internalToken: string | undefined,
  ): Promise<InventoryActionResponse> {
    this.requireInternalToken(internalToken);
    const expired = await this.repository.expireInventoryReservations();
    await this.events.publish("marketplace.inventory.expired", {
      affected: expired.affected,
      occurredAt: new Date().toISOString(),
    });
    return expired;
  }

  private requireSeller(user: AuthenticatedRequest["user"]): string {
    // Роль и sellerId проверяются вместе: одной роли без привязанного профиля
    // недостаточно для операций над товарами.
    if (!user.roles.includes("SELLER") || !user.sellerId) {
      throw new ForbiddenException("Seller role required");
    }
    return user.sellerId;
  }

  private requireModerator(user: AuthenticatedRequest["user"]): void {
    if (!user.roles.some((role) => role === "MODERATOR" || role === "ADMIN")) {
      throw new ForbiddenException("Moderator role required");
    }
  }

  private requireInternalToken(internalToken: string | undefined): void {
    if (internalToken !== (process.env.INTERNAL_SERVICE_TOKEN ?? "local-internal-token")) {
      throw new ForbiddenException("Internal token required");
    }
  }

  private async publishProductSnapshot(
    subject: "marketplace.product.created" | "marketplace.product.updated",
    productId: string,
    status?: "ACTIVE" | "HIDDEN" | "DELETED",
  ): Promise<void> {
    const product = await this.repository.findProductCardById(productId);
    await this.events.publish(subject, {
      productId,
      status: status ?? "ACTIVE",
      document:
        status === "HIDDEN" || status === "DELETED" ? null : product,
      occurredAt: new Date().toISOString(),
    });
  }

  private async validateCategoryPlacement(
    categoryId: string | null,
    input: SaveCategory,
  ): Promise<void> {
    const categories = await this.repository.listCategories();
    if (categoryId && !categories.some((item) => item.id === categoryId)) {
      throw new NotFoundException("Category not found");
    }
    if (await this.repository.categorySlugExists(input.slug, categoryId ?? undefined)) {
      throw new ConflictException("Категория с таким адресом уже существует");
    }
    if (input.parentId && !categories.some((item) => item.id === input.parentId)) {
      throw new BadRequestException("Parent category not found");
    }
    if (categoryId && input.parentId) {
      if (categoryId === input.parentId) {
        throw new BadRequestException("Категория не может быть родителем самой себе");
      }
      if (await this.repository.isInSubtree(categoryId, input.parentId)) {
        throw new BadRequestException("Нельзя переместить категорию внутрь её ветки");
      }
    }
    const parentDepth = input.parentId
      ? await this.repository.categoryDepth(input.parentId)
      : 0;
    const subtreeDepth = categoryId
      ? await this.repository.subtreeDepth(categoryId)
      : 1;
    // Проверяется вся переносимая ветка, поэтому вложенные потомки также
    // гарантированно остаются в пределах пяти уровней.
    if (parentDepth + subtreeDepth > 5) {
      throw new BadRequestException("Максимальная глубина категорий — 5 уровней");
    }
  }
}
