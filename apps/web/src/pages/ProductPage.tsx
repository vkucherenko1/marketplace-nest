import type { ProductDetail, ProductVariant } from "@marketplace/contracts";
import { Check, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../features/cart/CartProvider";
import { money } from "../shared/format";
import { rememberProduct } from "../storage";
import { ProductReviews } from "../features/product/ProductReviews";

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
        // Аналитика пишется best-effort: карточка товара не должна падать,
        // если event pipeline временно недоступен.
        void api
          .recordAnalytics({
            name: "PRODUCT_VIEW",
            productId: item.id,
            sellerId: item.seller.id,
            categoryId: item.category.id,
          })
          .catch(() => undefined);
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
    <section className="mx-auto max-w-[1500px] px-3 py-6 sm:px-4 sm:py-8 lg:px-8">
      <nav className="mb-5 flex flex-wrap gap-2 text-xs text-ink/50 sm:mb-7 sm:text-sm">
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

      <div className="grid gap-6 rounded-3xl bg-white p-4 shadow-card sm:p-5 lg:grid-cols-[34%_1fr_320px] lg:gap-8 lg:p-8">
        <div className="flex items-start justify-center">
          <img
            className="max-h-[300px] w-full rounded-2xl object-cover sm:max-h-[360px] lg:max-h-[430px]"
            src={displayedImage}
            alt={product.name}
          />
        </div>
        <div className="flex flex-col">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
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

        </div>

        {/* Цена и главное действие вынесены в отдельный блок, как на крупных витринах. */}
        <aside className="sticky bottom-24 h-fit rounded-2xl border border-ink/8 bg-cream p-4 sm:p-5 lg:static">
          <div>
            <p className="text-2xl font-extrabold text-lime sm:text-3xl">
              {money.format(displayedPrice / 100)}
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {inStock
                ? `В наличии${selectedVariant ? `: ${selectedVariant.stock} шт.` : ""}`
                : "Нет в наличии"}
            </p>
            {isInCart ? (
              <Link
                className="tap-target mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime/10 px-6 py-4 font-bold text-lime"
                to="/cart"
              >
                <Check size={19} /> В корзине — перейти
              </Link>
            ) : (
              <button
                className="tap-target mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime px-6 py-4 font-bold text-white disabled:opacity-50"
                disabled={!inStock}
                onClick={() => {
                  cart.add(product, selectedVariant);
                  void api
                    .recordAnalytics({
                      name: "ADD_TO_CART",
                      productId: product.id,
                      sellerId: product.seller.id,
                      categoryId: product.category.id,
                      quantity: 1,
                    })
                    .catch(() => undefined);
                  setAdded(true);
                }}
              >
                {added ? <Check size={19} /> : <ShoppingBag size={19} />}
                {added ? "Добавлено в корзину" : "Добавить в корзину"}
              </button>
            )}
          </div>
          <div className="mt-5 border-t border-ink/10 pt-5 text-sm leading-6 text-ink/60">
            Доставка от 1 дня<br />
            Оплата онлайн или при получении
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[1.25fr_.75fr] lg:gap-8">
        <article className="rounded-3xl bg-white p-5 sm:p-7 lg:p-10">
          <p className="eyebrow">Описание</p>
          <h2 className="mt-2 text-3xl font-semibold">О товаре</h2>
          <p className="mt-5 text-base leading-8 text-ink/70 sm:mt-6 sm:text-lg sm:leading-9">
            {product.description}
          </p>
          <p className="mt-5 leading-8 text-ink/60">
            Карточка содержит актуальную цену и остаток выбранного варианта.
            Перед отправкой продавец проверяет комплектацию, а покупка защищена
            правилами возврата маркетплейса.
          </p>
        </article>
        <Link
          className="group rounded-3xl bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:ring-2 hover:ring-lime/20 sm:p-7 lg:p-10"
          to={`/seller/${product.seller.id}`}
          onClick={() =>
            sessionStorage.setItem(
              `marketplace-seller:${product.seller.id}`,
              JSON.stringify(product.seller),
            )
          }
        >
          <p className="eyebrow">Продавец</p>
          <h2 className="mt-2 text-3xl font-semibold">{product.seller.name}</h2>
          <p className="mt-5 text-5xl font-bold text-lime">
            {product.seller.rating.toFixed(1)}
          </p>
          <p className="mt-2 text-sm">
            На основе {product.seller.reviewCount} отзывов покупателей
          </p>
          <span className="mt-6 block text-sm font-semibold text-lime">
            Смотреть все товары продавца →
          </span>
        </Link>
      </div>

      <ProductReviews
        productSlug={product.slug}
        reviewCount={product.reviewCount}
      />
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
                ? "border-lime bg-lime/10 text-lime"
                : "border-ink/15 hover:border-lime"
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
