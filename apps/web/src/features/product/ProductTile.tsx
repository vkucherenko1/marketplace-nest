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
    <article className="group min-w-0 overflow-hidden rounded-2xl bg-white p-2 transition duration-300 hover:shadow-card">
      <Link
        className="relative block w-full overflow-hidden"
        to={`/product/${product.slug}`}
      >
        <img
          className="aspect-square w-full rounded-xl object-cover transition duration-500 group-hover:scale-105"
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
        />
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink/55 shadow-sm">
          <Heart size={16} />
        </span>
      </Link>
      <div className="px-2 pb-2 pt-3">
        <strong className="block text-xl tracking-tight text-lime">
          {money.format(product.priceMinor / 100)}
        </strong>
        <div className="mt-1 flex items-center gap-2 text-xs text-ink/50">
          <span className="flex items-center gap-1">
            <Star size={13} className="fill-current text-amber-500" />
            {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
          <span className="truncate">{product.seller.name}</span>
        </div>
        <Link
          className="mt-2 line-clamp-2 min-h-10 text-left text-sm leading-5"
          to={`/product/${product.slug}`}
        >
          {product.name}
        </Link>
        <div className="mt-3">
          {props.isInCart ? (
            <Link
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-lime/10 px-4 py-2.5 text-sm font-semibold text-lime"
              to="/cart"
            >
              <Check size={15} /> В корзине
            </Link>
          ) : (
            <button
              className="w-full cursor-pointer rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
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
