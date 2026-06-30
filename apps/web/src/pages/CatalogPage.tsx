import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Category } from "@marketplace/contracts";
import { api } from "../api";
import { CatalogSection } from "../features/catalog/CatalogSection";

export function CatalogPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!slug) {
      setCategory(null);
      return;
    }
    const controller = new AbortController();
    void api.categories(controller.signal).then((items) => {
      setCategories(items);
      setCategory(items.find((item) => item.slug === slug) ?? null);
    });
    return () => controller.abort();
  }, [slug]);

  const breadcrumbs = category
    ? getCategoryBreadcrumbs(category, categories)
    : [];
  const collapsedBreadcrumbs = collapseCategoryBreadcrumbs(breadcrumbs);

  return (
    <div className="pt-8">
      <nav className="mx-auto flex max-w-[1500px] min-w-0 items-center gap-2 overflow-hidden px-3 text-xs text-ink/50 sm:px-4 sm:text-sm lg:px-8">
        <Link className="shrink-0" to="/">Главная</Link>
        <span>/</span>
        <Link className="shrink-0" to="/catalog">Каталог</Link>
        {breadcrumbs.length > collapsedBreadcrumbs.length && (
          <>
            <span>/</span>
            <span
              className="rounded-full bg-white px-2 py-0.5 text-ink/45"
              aria-label="Промежуточные категории скрыты"
            >
              …
            </span>
          </>
        )}
        {collapsedBreadcrumbs.map((item) => (
          <span className="contents" key={item.id}>
            <span>/</span>
            {item.id === category?.id ? (
              <span className="min-w-0 truncate font-semibold text-ink">
                {item.name}
              </span>
            ) : (
              <Link className="max-w-32 truncate sm:max-w-none" to={`/category/${item.slug}`}>
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <CatalogSection
        showCategoryFilters={!slug}
        {...(slug ? { categorySlug: slug } : {})}
      />
    </div>
  );
}

function collapseCategoryBreadcrumbs(breadcrumbs: Category[]): Category[] {
  if (breadcrumbs.length <= 2) {
    return breadcrumbs;
  }
  return breadcrumbs.slice(-2);
}

function getCategoryBreadcrumbs(
  category: Category,
  categories: Category[],
): Category[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const result: Category[] = [];
  let current: Category | undefined = category;
  while (current) {
    result.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return result;
}
