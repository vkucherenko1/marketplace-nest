import type {
  AnalyticsEvent,
  Category,
  CompleteMediaUploadRequest,
  CheckoutRequest,
  CreateProductInput,
  LoginResponse,
  ManagedUser,
  MediaAsset,
  MediaUploadRequest,
  MediaUploadTicket,
  OrderSummary,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductListQuery,
  ProductReviewsResponse,
  PlatformOverview,
  ReviewSort,
  SaveCategory,
  SellerProduct,
  UpdateUserProfile,
  UserProfile,
  UserRole,
} from "@marketplace/contracts";

async function request<T>(
  path: string,
  options?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    ...options,
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Не удалось выполнить запрос");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  categories: (signal?: AbortSignal) =>
    request<Category[]>("categories", undefined, signal),

  createCategory: (accessToken: string, category: SaveCategory) =>
    request<Category>("moderation/categories", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(category),
    }),

  updateCategory: (
    accessToken: string,
    id: string,
    category: SaveCategory,
  ) =>
    request<Category>(`moderation/categories/${id}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(category),
    }),

  deleteCategory: (accessToken: string, id: string) =>
    request<void>(`moderation/categories/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  sellerProducts: (accessToken: string, page: number, pageSize: number) =>
    request<PaginatedResponse<SellerProduct>>(
      `seller/products?page=${page}&pageSize=${pageSize}`,
      {
      headers: { authorization: `Bearer ${accessToken}` },
      },
    ),

  createProduct: (accessToken: string, product: CreateProductInput) =>
    request<{ id: string; slug: string }>("seller/products", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(product),
    }),

  changeProductStatus: (
    accessToken: string,
    id: string,
    action: "hide" | "restore",
  ) =>
    request<void>(`seller/products/${id}/${action}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  deleteProduct: (accessToken: string, id: string) =>
    request<void>(`seller/products/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  moderationOverview: (accessToken: string) =>
    request<PlatformOverview>("moderation/overview", {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  adminUsers: (accessToken: string) =>
    request<PaginatedResponse<ManagedUser>>("admin/users?page=1&pageSize=20", {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  updateUserRoles: (
    accessToken: string,
    userId: string,
    roles: UserRole[],
  ) =>
    request<ManagedUser>(`admin/users/${userId}/roles`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ roles }),
    }),

  products: (query: ProductListQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    return request<PaginatedResponse<ProductCard>>(
      `products?${params.toString()}`,
      undefined,
      signal,
    );
  },

  product: (slug: string, signal?: AbortSignal) =>
    request<ProductDetail>(`products/${encodeURIComponent(slug)}`, undefined, signal),

  productReviews: (
    slug: string,
    query: {
      page: number;
      pageSize?: number;
      rating?: number;
      sort: ReviewSort;
    },
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize ?? 6),
      sort: query.sort,
    });
    if (query.rating) {
      params.set("rating", String(query.rating));
    }
    return request<ProductReviewsResponse>(
      `products/${encodeURIComponent(slug)}/reviews?${params.toString()}`,
      undefined,
      signal,
    );
  },

  login: (email: string, password: string) =>
    request<LoginResponse>("auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken: string) =>
    request<void>("auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }),

  profile: (accessToken: string) =>
    request<UserProfile>("auth/profile", {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  updateProfile: (accessToken: string, profile: UpdateUserProfile) =>
    request<UserProfile>("auth/profile", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(profile),
    }),

  checkout: (accessToken: string, checkout: CheckoutRequest) =>
    request<OrderSummary>("checkout", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(checkout),
    }),

  orders: (accessToken: string) =>
    request<OrderSummary[]>("orders", {
      headers: { authorization: `Bearer ${accessToken}` },
    }),

  signMediaUpload: (accessToken: string, media: MediaUploadRequest) =>
    request<MediaUploadTicket>("media/uploads/sign", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(media),
    }),

  completeMediaUpload: (accessToken: string, body: CompleteMediaUploadRequest) =>
    request<MediaAsset>("media/uploads/complete", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  recordAnalytics: (event: AnalyticsEvent) =>
    request<{ accepted: true }>("analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    }),
};
