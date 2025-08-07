import { AppSettings, Currency } from '@shared/schema';

const SETTINGS_KEY = 'coworking-settings';

const defaultSettings: AppSettings = {
  currency: 'USD',
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

export const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  BGN: 'лв',
};

export const currencyLabels: Record<Currency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  BGN: 'Bulgarian Lev',
};