import { ProductTile } from "../product/ProductTile";
import { useCart } from "../cart/CartProvider";
import { CatalogFilters } from "./CatalogFilters";
import { Pagination } from "./Pagination";
import { useCatalog } from "./useCatalog";

export function CatalogSection(props: {
  categorySlug?: string;
  showCategoryFilters?: boolean;
}) {
  const catalog = useCatalog(props.categorySlug);
  const cart = useCart();

  return (
    <section id="catalog" className="mx-auto max-w-[1500px] px-5 py-10 lg:px-10">
      <CatalogFilters
        categories={catalog.categories}
        category={catalog.category}
        search={catalog.search}
        sort={catalog.sort}
        showCategoryFilters={props.showCategoryFilters ?? true}
        onCategoryChange={catalog.setCategory}
        onSearch={catalog.setSearch}
        onSortChange={catalog.setSort}
      />

      {catalog.error && (
        <div className="mb-6 rounded-2xl bg-red-100 p-4 text-red-800">
          {catalog.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalog.loading
          ? Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-[430px] animate-pulse rounded-[1.5rem] bg-white/70"
              />
            ))
          : catalog.products.items.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                isInCart={cart.has(product)}
                onAdd={() => cart.add(product)}
              />
            ))}
      </div>

      {!catalog.loading && catalog.products.items.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-ink/20 py-20 text-center">
          Ничего не найдено. Попробуйте изменить запрос.
        </div>
      )}

      <Pagination
        page={catalog.products.page}
        pageSize={catalog.pageSize}
        total={catalog.products.total}
        totalPages={catalog.products.totalPages}
        visibleItems={catalog.products.items.length}
        onPageChange={catalog.setPage}
        onPageSizeChange={catalog.setPageSize}
      />
    </section>
  );
}
