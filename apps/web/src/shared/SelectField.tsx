import { Check, ChevronDown } from "lucide-react";
import { usePopover } from "./usePopover";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

export function SelectField<T extends string | number>(props: {
  ariaLabel: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const popover = usePopover();
  const selected =
    props.options.find((option) => option.value === props.value) ??
    props.options[0];

  return (
    <div
      className={`relative ${props.className ?? ""}`}
      ref={popover.containerRef}
    >
      <button
        type="button"
        aria-expanded={popover.isOpen}
        aria-haspopup="listbox"
        aria-label={props.ariaLabel}
        className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-left text-sm font-semibold shadow-sm transition hover:border-ink/35"
        onClick={() => popover.setIsOpen(!popover.isOpen)}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`shrink-0 transition-transform ${
            popover.isOpen ? "rotate-180" : ""
          }`}
          size={17}
        />
      </button>

      {popover.isOpen && (
        <div
          className="absolute right-0 z-40 mt-2 min-w-full overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 shadow-card"
          role="listbox"
        >
          {props.options.map((option) => {
            const isSelected = option.value === props.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-5 rounded-xl px-3 py-3 text-left text-sm transition ${
                  isSelected
                    ? "bg-lime font-semibold text-white"
                    : "hover:bg-cream"
                }`}
                onClick={() => {
                  props.onChange(option.value);
                  popover.setIsOpen(false);
                }}
              >
                <span>
                  <span className="block">{option.label}</span>
                  {option.description && (
                    <span
                      className={`mt-0.5 block text-xs ${
                        isSelected ? "text-white/60" : "text-ink/45"
                      }`}
                    >
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
