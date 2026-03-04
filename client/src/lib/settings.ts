import { AppSettings, Currency } from '@shared/schema';

const SETTINGS_KEY = 'coworking-settings';

const defaultSettings: AppSettings = {
  currency: 'EUR',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      return { ...defaultSettings, ...settings };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  try {
    const currentSettings = getSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Failed to save settings to local storage');
  }
}

export function getCurrency(): Currency {
  return getSettings().currency;
}

export function setCurrency(currency: Currency): void {
  saveSettings({ currency });
}

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