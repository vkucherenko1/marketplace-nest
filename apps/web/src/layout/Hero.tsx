import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-[1500px] gap-8 px-5 pb-12 pt-10 lg:grid-cols-[1.3fr_.7fr] lg:px-10 lg:pt-16">
      <div className="flex min-h-[420px] flex-col justify-between rounded-[2rem] bg-ink p-7 text-white lg:p-12">
        <div className="w-fit rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[.2em]">
          Новый маркетплейс
        </div>
        <div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-7xl">
            Вещи, которые
            <span className="block text-lime">попадают в точку.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/65">
            Прозрачные продавцы, живые рейтинги и аккуратная подборка без
            бесконечного шума.
          </p>
        </div>
      </div>
      <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-coral p-8">
        <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-lime" />
        <div className="absolute bottom-[-7rem] left-[-3rem] h-80 w-80 rounded-full border-[45px] border-ink" />
        <div className="relative flex h-full flex-col justify-between">
          <p className="max-w-xs text-2xl font-semibold leading-tight">
            150 товаров уже ждут локального запуска.
          </p>
          <a
            className="flex w-fit items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold"
            href="#catalog"
          >
            Смотреть каталог <ArrowRight size={17} />
          </a>
        </div>
      </div>
    </section>
  );
}
