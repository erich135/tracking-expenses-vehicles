
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function Autocomplete({
  value,
  onChange,
  fetcher,
  displayField,
  valueField = 'id',
  placeholder = 'Select an option...',
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (value && value[displayField]) {
      setInputValue(value[displayField]);
    } else {
      setInputValue('');
    }
  }, [value, displayField]);

  const fetchData = useCallback(async (search) => {
    setLoading(true);
    const data = await fetcher(search);
    if (isMounted.current) {
      setOptions(data || []);
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!open) return;
    const debounceTimer = setTimeout(() => {
      fetchData(inputValue);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, open, fetchData]);

  const handleSelect = (currentValue) => {
    const selectedOption = options.find(
      (option) => (option[displayField] || '').toLowerCase() === (currentValue || '').toLowerCase()
    );
    onChange(selectedOption || null);
    setInputValue(selectedOption ? selectedOption[displayField] : '');
    setOpen(false);
  };

  const displayValue = (value && value[displayField]) ? value[displayField] : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {loading && <CommandEmpty>Loading...</CommandEmpty>}
            {!loading && options.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option[valueField]}
                  value={option[displayField]}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value && value[valueField] === option[valueField]
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  {option[displayField]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
