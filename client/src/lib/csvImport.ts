import Papa from 'papaparse';
import type { Client } from '@shared/schema';

export type ImportableField =
  | 'name'
  | 'email'
  | 'phone'
  | 'contact'
  | 'billingAddress'
  | 'taxId'
  | 'vatId'
  | 'representativeName'
  | 'ignore';

export const IMPORTABLE_FIELD_LABELS: Record<ImportableField, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  contact: 'Company / contact',
  billingAddress: 'Billing address',
  taxId: 'Tax ID',
  vatId: 'VAT ID',
  representativeName: 'Representative name',
  ignore: '(ignore column)',
};

const HEADER_ALIASES: Record<Exclude<ImportableField, 'ignore'>, string[]> = {
  name: ['name', 'full name', 'fullname', 'member name', 'member', 'first name'],
  email: ['email', 'e-mail', 'mail', 'email address'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'phone number', 'cell'],
  contact: ['contact', 'company', 'organization', 'organisation', 'business'],
  billingAddress: ['billing address', 'address', 'invoice address'],
  taxId: ['tax id', 'taxid', 'eik', 'company id', 'tax number'],
  vatId: ['vat id', 'vatid', 'vat', 'vat number'],
  representativeName: ['representative', 'rep name', 'representative name', 'mol'],
};

const ROW_LIMIT = 500;
const PREVIEW_LIMIT = 50;

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  ignoredColumns: number;
  tooManyRows: boolean;
  rowCount: number;
}

export interface MappedRow {
  index: number;
  raw: Record<string, string>;
  values: Partial<Record<Exclude<ImportableField, 'ignore'>, string>>;
  errors: string[];
  isDuplicateInFile: boolean;
  isDuplicateInDb: boolean;
}

export interface ValidatedImport {
  rows: MappedRow[];
  validCount: number;
  errorCount: number;
  duplicateInFileCount: number;
  duplicateInDbCount: number;
}

export type NewClientPayload = Pick<
  Client,
  'name' | 'email' | 'phone' | 'contact' | 'billingAddress' | 'taxId' | 'vatId' | 'representativeName'
>;

export function parseCsv(input: string): ParseResult {
  const trimmed = input.replace(/^﻿/, '');
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });

  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  const allRows = result.data as Record<string, string>[];
  const rowCount = allRows.length;
  const tooManyRows = rowCount > ROW_LIMIT;
  const rows = tooManyRows ? allRows.slice(0, ROW_LIMIT) : allRows;

  return { headers, rows, ignoredColumns: 0, tooManyRows, rowCount };
}

export function autoMapColumns(headers: string[]): Record<string, ImportableField> {
  const mapping: Record<string, ImportableField> = {};
  const used = new Set<ImportableField>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    let matched: ImportableField = 'ignore';

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      Exclude<ImportableField, 'ignore'>,
      string[],
    ][]) {
      if (used.has(field)) continue;
      if (aliases.includes(normalized)) {
        matched = field;
        break;
      }
    }

    mapping[header] = matched;
    if (matched !== 'ignore') used.add(matched);
  }

  return mapping;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailLocalPart(email: string): string {
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : '';
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: Record<string, ImportableField>,
  existingEmails: Set<string>,
): ValidatedImport {
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenNames = new Set<string>();

  const mapped: MappedRow[] = rows.map((raw, index) => {
    const values: MappedRow['values'] = {};
    const errors: string[] = [];

    for (const [header, field] of Object.entries(mapping)) {
      if (field === 'ignore') continue;
      const v = (raw[header] ?? '').trim();
      if (v.length > 0) values[field] = v;
    }

    if (!values.name && values.email) {
      const fallback = emailLocalPart(values.email);
      if (fallback) values.name = fallback;
    }

    if (!values.name) errors.push('Missing name (and no email to fall back on)');
    if (values.email && !EMAIL_RE.test(values.email)) errors.push('Invalid email format');

    let isDuplicateInFile = false;
    let isDuplicateInDb = false;

    if (values.email) {
      const lower = values.email.toLowerCase();
      if (existingEmails.has(lower)) isDuplicateInDb = true;
      if (seenEmails.has(lower)) isDuplicateInFile = true;
      else seenEmails.add(lower);
    } else if (values.phone) {
      if (seenPhones.has(values.phone)) isDuplicateInFile = true;
      else seenPhones.add(values.phone);
    } else if (values.name) {
      const lower = values.name.toLowerCase();
      if (seenNames.has(lower)) isDuplicateInFile = true;
      else seenNames.add(lower);
    }

    return { index, raw, values, errors, isDuplicateInFile, isDuplicateInDb };
  });

  let validCount = 0;
  let errorCount = 0;
  let duplicateInFileCount = 0;
  let duplicateInDbCount = 0;

  for (const r of mapped) {
    if (r.errors.length > 0) errorCount++;
    else if (r.isDuplicateInDb) duplicateInDbCount++;
    else if (r.isDuplicateInFile) duplicateInFileCount++;
    else validCount++;
  }

  return {
    rows: mapped,
    validCount,
    errorCount,
    duplicateInFileCount,
    duplicateInDbCount,
  };
}

export function rowsToCommit(validated: ValidatedImport): NewClientPayload[] {
  return validated.rows
    .filter((r) => r.errors.length === 0 && !r.isDuplicateInFile && !r.isDuplicateInDb)
    .map((r) => ({
      name: r.values.name!,
      email: r.values.email ?? null,
      phone: r.values.phone ?? null,
      contact: r.values.contact ?? null,
      billingAddress: r.values.billingAddress ?? null,
      taxId: r.values.taxId ?? null,
      vatId: r.values.vatId ?? null,
      representativeName: r.values.representativeName ?? null,
    }));
}

export function previewRows(validated: ValidatedImport): MappedRow[] {
  return validated.rows.slice(0, PREVIEW_LIMIT);
}

export const CSV_IMPORT_LIMITS = {
  ROW_LIMIT,
  PREVIEW_LIMIT,
  CHUNK_SIZE: 100,
};
