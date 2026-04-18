import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { countryCodeOptions, getCountryCodeOption } from "@/lib/phone";

interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function CountryCodeSelect({ value, onChange, className }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => getCountryCodeOption(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[145px] justify-between px-3 font-normal", className)}
        >
          <span className="flex items-center gap-2 overflow-hidden">
            <span className="text-base leading-none">{selectedOption.flag}</span>
            <span className="truncate">{selectedOption.value}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country code..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {countryCodeOptions.map((option) => (
              <CommandItem
                key={`${option.iso2}-${option.value}`}
                value={`${option.country} ${option.value} ${option.iso2}`}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="gap-3"
              >
                <span className="text-base leading-none">{option.flag}</span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{option.country}</span>
                  <span className="text-muted-foreground">{option.value}</span>
                </span>
                <Check
                  className={cn(
                    "h-4 w-4",
                    option.value === selectedOption.value ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
