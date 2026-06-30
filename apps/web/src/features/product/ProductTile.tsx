import type { ProductCard } from "@marketplace/contracts";
import { Check, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { money } from "../../shared/format";
import { useFavorites } from "../favorites/FavoritesProvider";

export function ProductTile(props: {
  product: ProductCard;
  isInCart: boolean;
  onAdd: () => void;
}) {
  const { product } = props;
  const favorites = useFavorites();
  const isFavorite = favorites.has(product.id);
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl bg-white p-1.5 transition duration-300 hover:shadow-card sm:p-2">
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
      </Link>
      <button
        type="button"
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? "Убрать из избранного" : "Добавить в избранное"} ${product.name}`}
        className={`absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-105 ${
          isFavorite ? "text-coral" : "text-ink/55 hover:text-coral"
        }`}
        onClick={() => favorites.toggle(product)}
      >
        <Heart size={16} className={isFavorite ? "fill-current" : ""} />
      </button>
      <div className="px-2 pb-3 pt-3">
        <strong className="block text-xl tracking-tight text-lime">
          {money.format(product.priceMinor / 100)}
        </strong>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-ink/50">
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
              className="tap-target flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-lime/10 px-4 py-2.5 text-sm font-semibold text-lime"
              to="/cart"
            >
              <Check size={15} /> В корзине
            </Link>
          ) : (
            <button
              className="tap-target w-full cursor-pointer rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
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
