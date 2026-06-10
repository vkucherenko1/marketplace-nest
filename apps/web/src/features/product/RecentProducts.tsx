import type { ProductCard } from "@marketplace/contracts";
import { Link } from "react-router-dom";
import { money } from "../../shared/format";

export function RecentProducts(props: {
  products: ProductCard[];
}) {
  if (props.products.length === 0) {
    return null;
  }

  return (
    <section id="recent" className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10">
      <p className="eyebrow">История</p>
      <h2 className="section-title mb-7">Вы недавно смотрели</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {props.products.slice(0, 5).map((product) => (
          <Link
            key={product.id}
            className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-card"
            to={`/product/${product.slug}`}
          >
            <img
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
              src={product.imageUrl}
              alt=""
            />
            <span className="min-w-0">
              <strong className="line-clamp-2 text-sm">{product.name}</strong>
              <span className="mt-2 block text-sm text-ink/55">
                {money.format(product.priceMinor / 100)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
