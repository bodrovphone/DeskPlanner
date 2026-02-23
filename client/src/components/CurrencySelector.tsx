import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Currency } from '@shared/schema';
import { getCurrency, setCurrency, currencySymbols, activeCurrencies } from '@/lib/settings';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: Currency) => void;
}

export default function CurrencySelector({ onCurrencyChange }: CurrencySelectorProps) {
  const [currency, setCurrencyState] = useState<Currency>('EUR');

  useEffect(() => {
    setCurrencyState(getCurrency());
  }, []);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    setCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Currency:</span>
      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {activeCurrencies.map(c => (
            <SelectItem key={c} value={c}>
              <div className="flex items-center gap-2">
                <span>{currencySymbols[c]}</span>
                <span>{c}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}