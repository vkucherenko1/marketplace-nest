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
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Каталог</p>
          <h2 className="section-title">Найдите своё</h2>
        </div>
        <form
          className="flex w-full max-w-xl rounded-full border border-ink/15 bg-white p-1.5 shadow-sm"
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
          <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Найти
          </button>
        </form>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        {props.showCategoryFilters && (
          <>
            <FilterButton
              active={!props.category}
              label="Все товары"
              count={total}
              to="/catalog"
            />
            {rootCategories.map((item) => (
              <FilterButton
                key={item.id}
                active={props.category === item.slug}
                label={item.name}
                count={item.productCount}
                to={`/category/${item.slug}`}
              />
            ))}
          </>
        )}
        <SelectField
          ariaLabel="Сортировка"
          className="ml-auto min-w-56"
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
      className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
        props.active ? "bg-ink text-white" : "border border-ink/15 hover:bg-white"
      }`}
      to={props.to}
    >
      {props.label} <span className="ml-1 opacity-50">{props.count}</span>
    </Link>
  );
}
