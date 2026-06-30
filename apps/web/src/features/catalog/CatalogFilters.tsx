import type { Category, ProductSort } from "@marketplace/contracts";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SelectField } from "../../shared/SelectField";

const sortOptions: { value: ProductSort; label: string; description: string }[] = [
  {
    value: "relevance",
    label: "По соответствию",
    description: "Сначала наиболее подходящие",
  },
  {
    value: "sales",
    label: "По популярности",
    description: "Сначала чаще покупаемые",
  },
  {
    value: "price_asc",
    label: "Сначала дешевле",
    description: "Цена по возрастанию",
  },
  {
    value: "price_desc",
    label: "Сначала дороже",
    description: "Цена по убыванию",
  },
  {
    value: "rating",
    label: "По рейтингу",
    description: "Лучшие оценки покупателей",
  },
];

export function CatalogFilters(props: {
  categories: Category[];
  category: string;
  search: string;
  sort: ProductSort;
  showCategoryFilters: boolean;
  title?: string;
  categoryBasePath?: string;
  onCategoryChange: (value: string) => void;
  onSearch: (value: string) => void;
  onSortChange: (value: ProductSort) => void;
}) {
  const [searchInput, setSearchInput] = useState(props.search);
  const rootCategories = props.categories.filter(
    (category) => category.parentId === null,
  );
  const total = rootCategories.reduce(
    (sum, item) => sum + item.productCount,
    0,
  );

  useEffect(() => {
    setSearchInput(props.search);
  }, [props.search]);

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:mb-6 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Каталог товаров</p>
          <h2 className="section-title">
            {props.title ?? "Популярное для вас"}
          </h2>
        </div>
        <form
          className="flex w-full rounded-xl border border-ink/10 bg-white p-1 shadow-sm lg:max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSearch(searchInput.trim());
          }}
        >
          <Search className="ml-4 self-center text-ink/40" size={19} />
          <input
            className="min-w-0 flex-1 bg-transparent px-3 outline-none"
            placeholder="Поиск по товарам"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button className="rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-white">
            Найти
          </button>
        </form>
      </div>

      <div className="mb-7 flex flex-col gap-3 lg:flex-row lg:items-center">
        {props.showCategoryFilters && (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <FilterButton
              active={!props.category}
              label="Все товары"
              count={total}
              to={props.categoryBasePath ?? "/catalog"}
            />
            {rootCategories.map((item) => (
              <FilterButton
                key={item.id}
                active={props.category === item.slug}
                label={item.name}
                count={item.productCount}
                to={
                  props.categoryBasePath
                    ? `${props.categoryBasePath}?category=${encodeURIComponent(item.slug)}`
                    : `/category/${item.slug}`
                }
              />
            ))}
          </div>
        )}
        <SelectField
          ariaLabel="Сортировка"
          className="w-full lg:ml-auto lg:min-w-56 lg:max-w-72"
          value={props.sort}
          options={sortOptions}
          onChange={props.onSortChange}
        />
      </div>
    </>
  );
}

function FilterButton(props: {
  active: boolean;
  label: string;
  count: number;
  to: string;
}) {
  return (
    <Link
      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        props.active ? "bg-lime text-white" : "bg-white hover:text-lime"
      }`}
      to={props.to}
    >
      {props.label} <span className="ml-1 opacity-50">{props.count}</span>
    </Link>
  );
}
