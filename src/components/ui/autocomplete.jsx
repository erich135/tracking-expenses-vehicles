
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  console.log('Autocomplete rendered with:', { value, displayField, options });

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
    console.log('Fetching data for:', search);
    const data = await fetcher(search);
    console.log('Fetched data:', data);
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center"
      >
        <span className="truncate">{displayValue}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-background shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {loading && (
              <div className="py-2 px-2 text-sm text-muted-foreground">Loading...</div>
            )}
            {!loading && options.length === 0 && (
              <div className="py-2 px-2 text-sm text-muted-foreground">No results found.</div>
            )}
            {!loading && options.length > 0 && (
              <div>
                {options.map((option, index) => (
                  <button
                    key={option[valueField] || index}
                    type="button"
                    className="w-full text-left px-2 py-2 text-sm hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      console.log('BUTTON CLICKED:', option);
                      console.log('Calling onChange with:', option);
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
