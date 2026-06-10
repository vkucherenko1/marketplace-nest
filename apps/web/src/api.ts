import type {
  Category,
  LoginResponse,
  PaginatedResponse,
  ProductCard,
  ProductDetail,
  ProductListQuery,
  SaveCategory,
  UpdateUserProfile,
  UserProfile,
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
};
