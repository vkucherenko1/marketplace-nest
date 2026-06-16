import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../features/cart/CartProvider";
import { cartItemTotalMinor } from "../features/cart/cartMath";
import { money } from "../shared/format";

export function CartPage() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-[1500px] px-5 py-24 text-center lg:px-10">
        <h1 className="text-5xl font-semibold">Корзина пуста</h1>
        <p className="mt-4 text-ink/55">Добавьте товары из каталога.</p>
        <Link
          className="primary-button mt-7"
          to="/catalog"
        >
          Перейти в каталог
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">
      <h1 className="text-4xl font-bold">Корзина</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          {cart.items.map((item) => (
            <article
              key={item.key}
              className="grid grid-cols-[100px_1fr] gap-5 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[130px_1fr_auto]"
            >
              <img
                className="aspect-square w-full rounded-xl object-cover"
                src={item.variant?.imageUrl ?? item.product.imageUrl}
                alt={item.product.name}
              />
              <div>
                <Link
                  className="font-semibold"
                  to={`/product/${item.product.slug}${item.variant ? `/variant/${item.variant.slug}` : ""}`}
                >
                  {item.product.name}
                </Link>
                {item.variant && (
                  <p className="mt-2 text-sm text-ink/55">
                    {item.variant.name}: {item.variant.value}
                  </p>
                )}
                <span className="mt-4 block text-sm text-ink/50">
                  Цена за штуку
                </span>
                <strong className="mt-1 block">
                  {money.format(
                    (item.variant?.priceMinor ?? item.product.priceMinor) / 100,
                  )}
                </strong>
                {item.quantity > 1 && (
                  <p className="mt-2 text-sm font-semibold text-lime">
                    Сумма: {money.format(cartItemTotalMinor(item) / 100)}
                  </p>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <QuantityControl
                  name={item.product.name}
                  quantity={item.quantity}
                  max={item.variant?.stock ?? 999}
                  onChange={(quantity) => cart.setQuantity(item.key, quantity)}
                />
                <button
                  aria-label={`Удалить ${item.product.name}`}
                  className="ml-3 cursor-pointer text-red-700"
                  onClick={() => cart.remove(item.key)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-3xl bg-white p-7 shadow-card">
          <h2 className="text-xl font-bold">Ваш заказ</h2>
          <p className="mt-4 text-sm text-ink/55">Товаров: {cart.count}</p>
          <div className="mt-5 flex items-end justify-between">
            <span>Итого</span>
            <strong className="text-3xl">
              {money.format(cart.totalMinor / 100)}
            </strong>
          </div>
          <button className="mt-7 w-full cursor-pointer rounded-xl bg-lime py-4 font-bold text-white">
            Перейти к оформлению
          </button>
        </aside>
      </div>
    </section>
  );
}

function QuantityControl(props: {
  name: string;
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  const [value, setValue] = useState(String(props.quantity));

  useEffect(() => {
    setValue(String(props.quantity));
  }, [props.quantity]);

  function commit(rawValue: string): void {
    const quantity = Math.min(
      props.max,
      Math.max(1, Math.trunc(Number(rawValue)) || props.quantity),
    );
    setValue(String(quantity));
    props.onChange(quantity);
  }

  return (
    <div className="flex items-center rounded-xl border border-ink/10 bg-cream p-1">
      <button
        type="button"
        aria-label={`Уменьшить количество ${props.name}`}
        disabled={props.quantity <= 1}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white text-lime disabled:cursor-not-allowed disabled:opacity-35"
        onClick={() => props.onChange(props.quantity - 1)}
      >
        <Minus size={16} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`Количество ${props.name}`}
        className="w-14 bg-transparent px-1 text-center font-semibold outline-none"
        value={value}
        onChange={(event) => {
          if (/^\d*$/.test(event.target.value)) {
            setValue(event.target.value);
          }
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        aria-label={`Увеличить количество ${props.name}`}
        disabled={props.quantity >= props.max}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-white text-lime disabled:cursor-not-allowed disabled:opacity-35"
        onClick={() => props.onChange(props.quantity + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
