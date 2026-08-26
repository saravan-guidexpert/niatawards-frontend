import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type SearchableOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
};

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-primary-foreground/5 border-primary-foreground/10 px-3 text-left text-sm text-primary-foreground",
            className,
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#141414] border-white/10 text-white"
      >
        <Command className="bg-[#141414] text-white [&_[cmdk-input-wrapper]]:border-white/10" shouldFilter>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 text-sm text-white placeholder:text-white/35"
          />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-4 text-xs text-white/45">No match.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="text-sm text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", opt.value === value ? "opacity-100 text-secondary" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
