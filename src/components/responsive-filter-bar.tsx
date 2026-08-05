"use client";

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

type ResponsiveFilterBarProps = {
  searchLabel: string;
  searchPlaceholder: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  options?: string[];
  selectedOption?: string;
  onOptionChange?: (value: string) => void;
};

export function ResponsiveFilterBar({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  options = [],
  selectedOption,
  onOptionChange
}: ResponsiveFilterBarProps) {
  const [localQuery, setLocalQuery] = useState(searchValue ?? "");
  const [localOption, setLocalOption] = useState(selectedOption ?? options[0] ?? "");
  const query = searchValue ?? localQuery;
  const currentOption = selectedOption ?? localOption;

  function updateQuery(value: string) {
    if (searchValue === undefined) {
      setLocalQuery(value);
    }
    onSearchChange?.(value);
  }

  function updateOption(value: string) {
    if (selectedOption === undefined) {
      setLocalOption(value);
    }
    onOptionChange?.(value);
  }

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-line bg-[#f8fbfd] p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-4">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 py-2.5 text-sm text-steel shadow-sm focus-within:border-marine focus-within:ring-2 focus-within:ring-[#d8edf6]">
        <Search className="h-4 w-4 shrink-0 text-marine" />
        <input
          aria-label={searchLabel}
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-steel"
        />
      </label>

      {options.length ? (
        <>
          <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-steel">필터</span>
            <div className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-0.5">
              {options.map((option) => {
                const active = option === currentOption;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateOption(option)}
                    className={[
                      "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-3.5 text-sm font-semibold transition",
                      active
                        ? "border-marine bg-marine text-white shadow-sm"
                        : "border-line bg-white text-steel hover:border-marine hover:text-marine"
                    ].join(" ")}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="relative flex w-full items-center lg:hidden">
            <SlidersHorizontal className="pointer-events-none absolute left-3 h-4 w-4 text-marine" />
            <select
              aria-label={`${searchLabel} 필터`}
              value={currentOption}
              onChange={(event) => updateOption(event.target.value)}
              className="h-11 w-full appearance-none rounded-md border border-line bg-white pl-10 pr-10 text-sm font-semibold text-ink outline-none focus:border-marine focus:ring-2 focus:ring-[#d8edf6]"
            >
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-steel" />
          </label>
        </>
      ) : null}
    </div>
  );
}
