import { ArrowRight, BadgePercent, ShieldCheck, Truck } from "lucide-react";
import type { ReactNode } from "react";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1500px] px-4 pb-8 pt-5 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[1.55fr_.45fr]">
        <div className="relative flex min-h-[330px] overflow-hidden rounded-3xl bg-gradient-to-br from-lime via-blue-600 to-coral p-7 text-white lg:p-10">
          <div className="relative z-10 flex max-w-2xl flex-col justify-between">
            <div className="w-fit rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
              Большая летняя распродажа
            </div>
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-.05em] sm:text-6xl">
                Всё нужное
                <span className="block text-white/80">
                  по отличным ценам
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
                Тысячи товаров от проверенных продавцов с быстрой доставкой.
              </p>
              <a
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-lime"
                href="#catalog"
              >
                Смотреть товары <ArrowRight size={18} />
              </a>
            </div>
          </div>
          <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-white/15" />
          <div className="absolute right-24 top-10 h-28 w-28 rotate-12 rounded-3xl bg-white/10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <PromoCard
            icon={<BadgePercent size={25} />}
            title="Скидки до 40%"
            text="На популярные товары недели"
          />
          <PromoCard
            icon={<Truck size={25} />}
            title="Быстрая доставка"
            text="Следите за заказом онлайн"
          />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Benefit icon={<ShieldCheck size={20} />} title="Безопасная оплата" />
        <Benefit icon={<Truck size={20} />} title="Удобная доставка" />
        <Benefit icon={<BadgePercent size={20} />} title="Выгодные предложения" />
      </div>
    </section>
  );
}

function PromoCard(props: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="flex min-h-[157px] flex-col justify-between rounded-3xl bg-white p-6 shadow-card">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime/10 text-lime">
        {props.icon}
      </span>
      <div>
        <strong className="block text-xl">{props.title}</strong>
        <span className="mt-1 block text-sm text-ink/50">{props.text}</span>
      </div>
    </article>
  );
}

function Benefit(props: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold">
      <span className="text-lime">{props.icon}</span>
      {props.title}
    </div>
  );
}
