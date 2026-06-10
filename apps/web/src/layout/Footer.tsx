export function Footer() {
  return (
    <footer id="about" className="mt-12 bg-ink px-5 py-12 text-white lg:px-10">
      <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 sm:flex-row">
        <strong className="text-2xl">market pulse</strong>
        <p className="max-w-xl text-sm leading-6 text-white/55">
          Локальный preview микросервисного маркетплейса на NestJS, React и
          TypeScript. Каталог, роли и инфраструктура развиваются по TASKS.md.
        </p>
      </div>
    </footer>
  );
}
