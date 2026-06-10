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

  return (
    <div className="pt-8">
      <nav className="mx-auto flex max-w-[1500px] items-center gap-2 px-5 text-sm text-ink/50 lg:px-10">
        <Link to="/">Главная</Link>
        <span>/</span>
        <Link to="/catalog">Каталог</Link>
        {breadcrumbs.map((item) => (
          <span className="contents" key={item.id}>
            <span>/</span>
            {item.id === category?.id ? (
              <span className="font-semibold text-ink">{item.name}</span>
            ) : (
              <Link to={`/category/${item.slug}`}>{item.name}</Link>
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
