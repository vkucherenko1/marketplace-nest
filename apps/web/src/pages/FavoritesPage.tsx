import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../features/cart/CartProvider";
import { useFavorites } from "../features/favorites/FavoritesProvider";
import { ProductTile } from "../features/product/ProductTile";

export function FavoritesPage() {
  const favorites = useFavorites();
  const cart = useCart();

  if (favorites.items.length === 0) {
    return (
      <section className="mx-auto max-w-[1500px] px-3 py-20 text-center sm:px-4 lg:px-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime/10 text-lime">
          <Heart size={28} />
        </div>
        <h1 className="mt-6 text-4xl font-bold">Избранное пусто</h1>
        <p className="mx-auto mt-3 max-w-md text-ink/55">
          Нажимайте сердечко на товарах, чтобы собрать быстрый список покупок.
        </p>
        <Link className="primary-button mt-7" to="/catalog">
          Перейти в каталог
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1500px] px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Личный список</p>
          <h1 className="section-title">Избранное</h1>
        </div>
        <p className="text-sm text-ink/55">
          {favorites.count} товаров сохранено
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {favorites.items.map((product) => (
          <ProductTile
            key={product.id}
            product={product}
            isInCart={cart.has(product)}
            onAdd={() => cart.add(product)}
          />
        ))}
      </div>
    </section>
  );
}
