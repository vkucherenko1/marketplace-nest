export function Footer() {
  return (
    <footer id="about" className="mt-12 bg-white px-5 py-12 text-ink lg:px-10">
      <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 sm:flex-row">
        <strong className="text-2xl font-extrabold text-lime">MARKET.</strong>
        <p className="max-w-xl text-sm leading-6 text-ink/55">
          Локальный preview микросервисного маркетплейса на NestJS, React и
          TypeScript. Каталог, роли и инфраструктура развиваются итерационно.
        </p>
      </div>
    </footer>
  );
}
