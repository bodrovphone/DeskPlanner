import type { PaymentMethodType } from '@shared/schema';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodType, string> = {
  credit_card: 'Credit card',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
};

// Sentinel used in shadcn Select when representing a "cleared / not set" value —
// empty strings are not allowed as SelectItem values.
export const SELECT_NONE_VALUE = '__none__';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
