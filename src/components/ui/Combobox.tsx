import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type ComboboxOption = {
  label: string;
  value: string;
};

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (val: string) => void;
  onInputChange?: (input: string) => void; // ✅ Add this line
  placeholder?: string;
}

export function Combobox({ options, value, onChange, onInputChange, placeholder }: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full border px-3 py-2 rounded-md text-left text-sm"
        >
          {value || <span className="text-muted">{placeholder || 'Select an option'}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search..."
            onValueChange={(input) => {
              if (onInputChange) onInputChange(input); // ✅ Allow external filtering
            }}
          />
          <CommandEmpty>No match found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
