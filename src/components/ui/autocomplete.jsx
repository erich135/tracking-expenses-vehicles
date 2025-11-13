
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
        <div className="border rounded-md bg-background">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <input
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="max-h-60 overflow-auto p-1">
            {loading && (
              <div className="py-2 px-2 text-sm text-muted-foreground">Loading...</div>
            )}
            {!loading && options.length === 0 && (
              <div className="py-2 px-2 text-sm text-muted-foreground">No results found.</div>
            )}
            {!loading && options.length > 0 && (
              <div>
                {options.map((option) => (
                  <div
                    key={option[valueField]}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      console.log('Option clicked:', option);
                      onChange(option);
                      setInputValue(option[displayField] || '');
                      setOpen(false);
                    }}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
