import type { PageSize } from "@marketplace/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../shared/IconButton";
import { SelectField } from "../../shared/SelectField";

const pageSizeOptions: { value: PageSize; label: string; description: string }[] = [
  { value: 20, label: "20 товаров", description: "Компактная страница" },
  { value: 50, label: "50 товаров", description: "Больше результатов" },
  { value: 100, label: "100 товаров", description: "Максимум на странице" },
];

export function Pagination(props: {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
  visibleItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-6">
      <p className="text-sm text-ink/55">
        Показано {props.visibleItems} из {props.total}
      </p>
      <div className="flex items-center gap-2">
        <SelectField
          ariaLabel="Количество товаров на странице"
          className="min-w-52"
          value={props.pageSize}
          options={pageSizeOptions}
          onChange={props.onPageSizeChange}
        />
        <IconButton
          aria-label="Предыдущая страница"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <span className="min-w-20 text-center text-sm">
          {props.page} / {Math.max(1, props.totalPages)}
        </span>
        <IconButton
          aria-label="Следующая страница"
          disabled={props.page >= props.totalPages}
          onClick={() =>
            props.onPageChange(Math.min(props.totalPages, props.page + 1))
          }
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </div>
  );
}
