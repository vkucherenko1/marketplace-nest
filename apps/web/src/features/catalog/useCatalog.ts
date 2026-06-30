import type {
  Category,
  PageSize,
  PaginatedResponse,
  ProductCard,
  ProductSort,
} from "@marketplace/contracts";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";

const pageSizes = [20, 50, 100] as const satisfies readonly PageSize[];
const productSorts = [
  "relevance",
  "sales",
  "price_asc",
  "price_desc",
  "rating",
] as const satisfies readonly ProductSort[];

const emptyPage: PaginatedResponse<ProductCard> = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
};

export function useCatalog(initialCategory = "", sellerId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState(emptyPage);
  const [category, setCategoryState] = useState(
    sellerId ? (searchParams.get("category") ?? "") : initialCategory,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const search = searchParams.get("search") ?? "";
  const sort = parseSort(searchParams.get("sort"));
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  useEffect(() => {
    const controller = new AbortController();
    void api
      .categories(controller.signal)
      .then(setCategories)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(toErrorMessage(reason));
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setCategoryState(
      sellerId ? (searchParams.get("category") ?? "") : initialCategory,
    );
  }, [initialCategory, searchParams, sellerId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    // Отмена предыдущего запроса защищает выдачу от гонки ответов
    // при быстрой смене фильтра, сортировки или поисковой строки.
    void api
      .products(
        {
          ...(category ? { category } : {}),
          ...(sellerId ? { sellerId } : {}),
          ...(search ? { search } : {}),
          sort,
          page,
          pageSize,
        },
        controller.signal,
      )
      .then(setProducts)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(toErrorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [category, page, pageSize, search, sellerId, sort]);

  return {
    categories,
    products,
    category,
    search,
    sort,
    page,
    pageSize,
    loading,
    error,
    setCategory(value: string) {
      setCategoryState(value);
      updateSearchParams({
        ...(sellerId ? { category: value } : {}),
        page: 1,
      });
    },
    setSearch(value: string) {
      updateSearchParams({ search: value, page: 1 });
    },
    setSort(value: ProductSort) {
      updateSearchParams({ sort: value, page: 1 });
    },
    setPage(value: number) {
      updateSearchParams({ page: value });
    },
    setPageSize(value: PageSize) {
      updateSearchParams({ pageSize: value, page: 1 });
    },
  };

  function updateSearchParams(
    changes: Partial<{
      search: string;
      sort: ProductSort;
      page: number;
      pageSize: PageSize;
      category: string;
    }>,
  ): void {
    // URL хранит состояние выдачи: ссылку можно открыть напрямую,
    // а кнопки браузера корректно возвращают предыдущую страницу каталога.
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setSearchParams(next);
  }
}

function toErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Ошибка загрузки";
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parsePageSize(value: string | null): PageSize {
  const pageSize = Number(value);
  return pageSizes.includes(pageSize as PageSize) ? (pageSize as PageSize) : 20;
}

function parseSort(value: string | null): ProductSort {
  return productSorts.includes(value as ProductSort)
    ? (value as ProductSort)
    : "relevance";
}
