import type { Category, ProductCard } from "@marketplace/contracts";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useCart } from "../cart/CartProvider";
import { ProductTile } from "../product/ProductTile";

interface PopularRail {
  category: Category;
  products: ProductCard[];
}

export function PopularCategoryRails() {
  const cart = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [rails, setRails] = useState<PopularRail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const topCategories = useMemo(
    () =>
      categories
        .filter((category) => category.parentId === null && category.productCount > 0)
        .sort(
          (left, right) =>
            right.salesCount - left.salesCount ||
            right.productCount - left.productCount ||
            left.name.localeCompare(right.name, "ru"),
        )
        .slice(0, 5),
    [categories],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api
      .categories(controller.signal)
      .then(setCategories)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Ошибка загрузки");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (topCategories.length === 0) {
      setRails([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    // API каталога поддерживает только публичные pageSize 20/50/100.
    // Для витрины берём первую страницу top-sales и режем до 10 товаров.
    void Promise.all(
      topCategories.map((category) =>
        api
          .products(
            {
              category: category.slug,
              sort: "sales",
              page: 1,
              pageSize: 20,
            },
            controller.signal,
          )
          .then((page) => ({
            category,
            products: page.items.slice(0, 10),
          })),
      ),
    )
      .then(setRails)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Ошибка загрузки");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [topCategories]);

  return (
    <section className="mx-auto max-w-[1500px] px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Популярное для вас</p>
          <h2 className="section-title">Топ продаж по категориям</h2>
        </div>
        <Link
          className="hidden items-center gap-1 text-sm font-semibold text-lime sm:flex"
          to="/catalog?sort=sales"
        >
          Все хиты <ChevronRight size={16} />
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-100 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-[360px] animate-pulse rounded-3xl bg-white/70" />
            ))
          : rails.map((rail) => (
              <article key={rail.category.id} className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold sm:text-2xl">
                      {rail.category.name}
                    </h3>
                    <p className="text-sm text-ink/50">
                      {rail.category.salesCount.toLocaleString("ru-RU")} продаж
                    </p>
                  </div>
                  <Link
                    className="text-sm font-semibold text-lime"
                    to={`/category/${rail.category.slug}?sort=sales`}
                  >
                    Смотреть все
                  </Link>
                </div>
                <div className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-3 sm:mx-0 sm:gap-3 sm:px-0">
                  {rail.products.map((product) => (
                    <div
                      key={product.id}
                      className="w-[calc((100%_-_0.5rem)/2)] min-w-[164px] snap-start sm:w-[calc((100%_-_1.5rem)/3)] sm:min-w-[210px] lg:w-[calc((100%_-_3rem)/5)] lg:min-w-[220px]"
                    >
                      <ProductTile
                        product={product}
                        isInCart={cart.has(product)}
                        onAdd={() => cart.add(product)}
                      />
                    </div>
                  ))}
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}
