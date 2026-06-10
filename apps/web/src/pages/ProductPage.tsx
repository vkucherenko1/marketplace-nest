import type { ProductDetail, ProductVariant } from "@marketplace/contracts";
import { Check, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../features/cart/CartProvider";
import { money } from "../shared/format";
import { rememberProduct } from "../storage";

export function ProductPage() {
  const { slug = "", variantSlug } = useParams();
  const cart = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setError("");
    setAdded(false);
    void api
      .product(slug, controller.signal)
      .then((item) => {
        setProduct(item);
        rememberProduct(item);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Товар не найден"),
      );
    return () => controller.abort();
  }, [slug]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.slug === variantSlug) ??
      product?.variants[0] ??
      null,
    [product, variantSlug],
  );

  if (error) {
    return <PageMessage title="Товар не найден" text={error} />;
  }
  if (!product) {
    return <PageMessage title="Загружаем товар" text="Пожалуйста, подождите." />;
  }

  const displayedPrice = selectedVariant?.priceMinor ?? product.priceMinor;
  const displayedImage = selectedVariant?.imageUrl ?? product.imageUrl;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : product.inStock;
  const isInCart = cart.has(product, selectedVariant);

  return (
    <section className="mx-auto max-w-[1500px] px-5 py-10 lg:px-10 lg:py-16">
      <nav className="mb-7 flex flex-wrap gap-2 text-sm text-ink/50">
        <Link to="/">Главная</Link>
        <span>/</span>
        <Link to="/catalog">Каталог</Link>
        <span>/</span>
        <Link to={`/category/${product.category.slug}`}>
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 rounded-[2rem] bg-white p-6 shadow-card lg:grid-cols-[42%_58%] lg:p-10">
        <div className="flex items-start justify-center">
          <img
            className="max-h-[480px] w-full rounded-[1.5rem] object-cover"
            src={displayedImage}
            alt={product.name}
          />
        </div>
        <div className="flex flex-col pr-0 lg:pr-8">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">
            {product.name}
          </h1>
          <Link
            className="mt-4 text-sm font-semibold"
            to={`/catalog?search=${encodeURIComponent(product.seller.name)}`}
          >
            Продавец: {product.seller.name} · {product.seller.rating.toFixed(1)}
          </Link>
          <div className="mt-5 flex items-center gap-2 text-sm">
            <Star className="fill-current text-amber-500" size={18} />
            <strong>{product.rating.toFixed(1)}</strong>
            <span className="text-ink/45">{product.reviewCount} отзывов</span>
          </div>

          <VariantSelector
            productSlug={product.slug}
            variants={product.variants}
            selected={selectedVariant}
          />

          <div className="mt-auto pt-8">
            <p className="text-4xl font-bold">
              {money.format(displayedPrice / 100)}
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {inStock
                ? `В наличии${selectedVariant ? `: ${selectedVariant.stock} шт.` : ""}`
                : "Нет в наличии"}
            </p>
            {isInCart ? (
              <Link
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 font-bold text-ink"
                to="/cart"
              >
                <Check size={19} /> В корзине — перейти
              </Link>
            ) : (
              <button
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 font-bold text-white disabled:opacity-50"
                disabled={!inStock}
                onClick={() => {
                  cart.add(product, selectedVariant);
                  setAdded(true);
                }}
              >
                {added ? <Check size={19} /> : <ShoppingBag size={19} />}
                {added ? "Добавлено в корзину" : "Добавить в корзину"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-[2rem] bg-white p-7 lg:p-10">
          <p className="eyebrow">Описание</p>
          <h2 className="mt-2 text-3xl font-semibold">О товаре</h2>
          <p className="mt-6 text-lg leading-9 text-ink/70">
            {product.description}
          </p>
          <p className="mt-5 leading-8 text-ink/60">
            Карточка содержит актуальную цену и остаток выбранного варианта.
            Перед отправкой продавец проверяет комплектацию, а покупка защищена
            правилами возврата маркетплейса.
          </p>
        </article>
        <aside className="rounded-[2rem] bg-lime p-7 lg:p-10">
          <p className="eyebrow">Продавец</p>
          <h2 className="mt-2 text-3xl font-semibold">{product.seller.name}</h2>
          <p className="mt-5 text-5xl font-bold">
            {product.seller.rating.toFixed(1)}
          </p>
          <p className="mt-2 text-sm">
            На основе {product.seller.reviewCount} отзывов покупателей
          </p>
        </aside>
      </div>

      <section className="mt-8 rounded-[2rem] bg-white p-7 lg:p-10">
        <p className="eyebrow">Отзывы покупателей</p>
        <h2 className="mt-2 text-3xl font-semibold">
          Что говорят о товаре
        </h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {product.reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-ink/10 p-5"
            >
              <div className="flex items-center gap-3">
                {review.authorAvatarUrl && (
                  <img
                    className="h-11 w-11 rounded-full object-cover"
                    src={review.authorAvatarUrl}
                    alt=""
                  />
                )}
                <div>
                  <strong className="block">{review.authorName}</strong>
                  <span className="text-xs text-ink/45">
                    {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-1 text-amber-500">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={index < review.rating ? "fill-current" : ""}
                    size={16}
                  />
                ))}
              </div>
              <p className="mt-4 leading-7 text-ink/70">{review.text}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function VariantSelector(props: {
  productSlug: string;
  variants: ProductVariant[];
  selected: ProductVariant | null;
}) {
  if (props.variants.length === 0) {
    return null;
  }
  return (
    <div className="mt-8">
      <p className="text-sm font-semibold">{props.variants[0]?.name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {props.variants.map((variant) => (
          <Link
            key={variant.id}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              props.selected?.id === variant.id
                ? "border-ink bg-ink text-white"
                : "border-ink/15 hover:border-ink"
            }`}
            to={`/product/${props.productSlug}/variant/${variant.slug}`}
          >
            {variant.value}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PageMessage({ title, text }: { title: string; text: string }) {
  return (
    <section className="mx-auto max-w-[1500px] px-5 py-24 text-center lg:px-10">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <p className="mt-4 text-ink/55">{text}</p>
    </section>
  );
}
