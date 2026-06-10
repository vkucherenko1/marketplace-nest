import type { ProductCard } from "@marketplace/contracts";
import { Check, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { money } from "../../shared/format";

export function ProductTile(props: {
  product: ProductCard;
  isInCart: boolean;
  onAdd: () => void;
}) {
  const { product } = props;
  return (
    <article className="group overflow-hidden rounded-[1.5rem] bg-white shadow-card transition duration-300 hover:-translate-y-1">
      <Link
        className="relative block w-full overflow-hidden"
        to={`/product/${product.slug}`}
      >
        <img
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          {product.category.name}
        </span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90">
          <Heart size={16} />
        </span>
      </Link>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-ink/50">
          <span>{product.seller.name}</span>
          <span className="flex items-center gap-1">
            <Star size={13} className="fill-current text-amber-500" />
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
        </div>
        <Link
          className="line-clamp-2 min-h-12 text-left font-semibold"
          to={`/product/${product.slug}`}
        >
          {product.name}
        </Link>
        <div className="mt-5 flex items-center justify-between">
          <strong className="text-xl">{money.format(product.priceMinor / 100)}</strong>
          {props.isInCart ? (
            <Link
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white"
              to="/cart"
            >
              <Check size={15} /> В корзине
            </Link>
          ) : (
            <button
              className="cursor-pointer rounded-full bg-lime px-4 py-2.5 text-sm font-bold transition hover:bg-ink hover:text-white"
              onClick={props.onAdd}
            >
              В корзину
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
