import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Currency } from '@shared/schema';
import { getCurrency, setCurrency, currencySymbols, currencyLabels } from '@/lib/settings';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: Currency) => void;
}

export default function CurrencySelector({ onCurrencyChange }: CurrencySelectorProps) {
  const [currency, setCurrencyState] = useState<Currency>('USD');

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
          <SelectItem value="USD">
            <div className="flex items-center gap-2">
              <span>{currencySymbols.USD}</span>
              <span>USD</span>
            </div>
          </SelectItem>
          <SelectItem value="EUR">
            <div className="flex items-center gap-2">
              <span>{currencySymbols.EUR}</span>
              <span>EUR</span>
            </div>
          </SelectItem>
          <SelectItem value="BGN">
            <div className="flex items-center gap-2">
              <span>{currencySymbols.BGN}</span>
              <span>BGN</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}