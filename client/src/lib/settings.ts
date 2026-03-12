import { Currency } from '@shared/schema';

const knownSymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BGN: 'лв',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  RUB: '₽',
  TRY: '₺',
  BRL: 'R$',
  PLN: 'zł',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  CZK: 'Kč',
  HUF: 'Ft',
  THB: '฿',
};

/** Returns the symbol for a currency code, falling back to the code itself */
export function currencySymbol(code: string): string {
  return knownSymbols[code] || code;
}

/** For backward compatibility — access as currencySymbols[code] */
export const currencySymbols = new Proxy(knownSymbols, {
  get(target, prop: string) {
    return target[prop] || prop;
  },
});

const knownLabels: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  BGN: 'Bulgarian Lev',
};

/** For backward compatibility — access as currencyLabels[code] */
export const currencyLabels = new Proxy(knownLabels, {
  get(target, prop: string) {
    return target[prop] || prop;
  },
});

// Shortcut currencies shown as buttons in onboarding
export const activeCurrencies: Currency[] = ['USD', 'EUR'];
