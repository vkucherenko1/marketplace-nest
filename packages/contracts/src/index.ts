export const USER_ROLES = ["ADMIN", "MODERATOR", "BUYER", "SELLER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const PRODUCT_SORTS = [
  "relevance",
  "price_asc",
  "price_desc",
  "rating",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  avatarUrl: string | null;
}

export interface UserProfile extends UserSummary {
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  phone: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  city: string | null;
  address: string | null;
}

export interface UpdateUserProfile {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  gender?: UserProfile["gender"];
  city?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: UserSummary;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  depth: number;
  productCount: number;
}

export interface SaveCategory {
  name: string;
  slug: string;
  parentId: string | null;
}

export interface SellerSummary {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: Pick<Category, "id" | "slug" | "name">;
  seller: SellerSummary;
  priceMinor: number;
  currency: "USD";
  rating: number;
  reviewCount: number;
  imageUrl: string;
  inStock: boolean;
}

export interface ProductVariant {
  id: string;
  slug: string;
  name: string;
  value: string;
  priceMinor: number;
  stock: number;
  imageUrl: string;
}

export interface ProductReview {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  rating: number;
  text: string;
  createdAt: string;
}

export interface ProductDetail extends ProductCard {
  variants: ProductVariant[];
  reviews: ProductReview[];
}

export interface CartItem {
  key: string;
  product: ProductCard;
  variant: ProductVariant | null;
  quantity: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
}

export interface ProductListQuery {
  category?: string;
  search?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: PageSize;
}
