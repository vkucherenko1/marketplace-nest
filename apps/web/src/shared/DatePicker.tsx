import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { usePopover } from "./usePopover";

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export function DatePicker(props: {
  value: string | null;
  onChange: (value: string | null) => void;
  ariaLabel: string;
}) {
  const popover = usePopover();
  const selectedDate = parseDate(props.value);
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        selectedDate?.getFullYear() ?? today.getFullYear(),
        selectedDate?.getMonth() ?? today.getMonth(),
        1,
      ),
  );
  const [yearMode, setYearMode] = useState(false);
  const days = useMemo(() => buildCalendar(visibleMonth), [visibleMonth]);

  function changeMonth(offset: number): void {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + offset,
        1,
      ),
    );
  }

  return (
    <div className="relative" ref={popover.containerRef}>
      <button
        type="button"
        aria-expanded={popover.isOpen}
        aria-haspopup="dialog"
        aria-label={props.ariaLabel}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-ink/15 bg-white px-4 py-3 text-left transition hover:border-ink/35"
        onClick={() => popover.setIsOpen(!popover.isOpen)}
      >
        <span className={props.value ? "" : "text-ink/35"}>
          {selectedDate
            ? selectedDate.toLocaleDateString("ru-RU")
            : "Выберите дату"}
        </span>
        <CalendarDays className="text-ink/45" size={19} />
      </button>

      {popover.isOpen && (
        <div
          className="absolute left-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-3rem)] rounded-[1.5rem] border border-ink/10 bg-white p-4 shadow-card"
          role="dialog"
          aria-label="Календарь"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <CalendarButton
                label="Предыдущий год"
                onClick={() => changeMonth(-12)}
              >
                <ChevronsLeft size={17} />
              </CalendarButton>
              <CalendarButton
                label="Предыдущий месяц"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={17} />
              </CalendarButton>
            </div>
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-cream"
              onClick={() => setYearMode(!yearMode)}
            >
              {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
            </button>
            <div className="flex gap-1">
              <CalendarButton
                label="Следующий месяц"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={17} />
              </CalendarButton>
              <CalendarButton
                label="Следующий год"
                onClick={() => changeMonth(12)}
              >
                <ChevronsRight size={17} />
              </CalendarButton>
            </div>
          </div>

          {yearMode ? (
            <YearGrid
              currentYear={visibleMonth.getFullYear()}
              onSelect={(year) => {
                setVisibleMonth(
                  new Date(year, visibleMonth.getMonth(), 1),
                );
                setYearMode(false);
              }}
            />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {weekdays.map((weekday) => (
                  <span
                    key={weekday}
                    className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-ink/35"
                  >
                    {weekday}
                  </span>
                ))}
                {days.map((day) => {
                  const isCurrentMonth =
                    day.getMonth() === visibleMonth.getMonth();
                  const isSelected =
                    selectedDate &&
                    formatDate(day) === formatDate(selectedDate);
                  const isToday = formatDate(day) === formatDate(today);
                  return (
                    <button
                      key={formatDate(day)}
                      type="button"
                      className={`grid aspect-square place-items-center rounded-xl text-sm font-semibold transition ${
                        isSelected
                          ? "bg-lime text-white"
                          : isToday
                            ? "bg-lime/10 text-lime"
                            : isCurrentMonth
                              ? "hover:bg-cream"
                              : "text-ink/25 hover:bg-cream"
                      }`}
                      onClick={() => {
                        props.onChange(formatDate(day));
                        popover.setIsOpen(false);
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
            <button
              type="button"
              className="rounded-full px-3 py-2 text-xs font-semibold text-ink/55 hover:bg-cream"
              onClick={() => {
                props.onChange(null);
                popover.setIsOpen(false);
              }}
            >
              Очистить
            </button>
            <button
              type="button"
              className="rounded-xl bg-lime px-4 py-2 text-xs font-bold text-white"
              onClick={() => {
                props.onChange(formatDate(today));
                setVisibleMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                popover.setIsOpen(false);
              }}
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarButton(props: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 hover:bg-cream"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function YearGrid(props: {
  currentYear: number;
  onSelect: (year: number) => void;
}) {
  const start = props.currentYear - 7;
  return (
    <div className="mt-4 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto">
      {Array.from({ length: 15 }, (_, index) => start + index).map((year) => (
        <button
          key={year}
          type="button"
          className={`rounded-xl px-3 py-3 text-sm font-semibold ${
            year === props.currentYear
              ? "bg-lime text-white"
              : "bg-cream hover:bg-lime/10 hover:text-lime"
          }`}
          onClick={() => props.onSelect(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}

function buildCalendar(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - mondayOffset,
  );
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
