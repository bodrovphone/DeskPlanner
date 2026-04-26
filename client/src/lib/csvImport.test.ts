import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  autoMapColumns,
  validateRows,
  rowsToCommit,
  CSV_IMPORT_LIMITS,
} from './csvImport';

describe('parseCsv', () => {
  it('parses comma-delimited CSV with headers', () => {
    const csv = 'name,email\nAlice,alice@x.com\nBob,bob@x.com';
    const r = parseCsv(csv);
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ name: 'Alice', email: 'alice@x.com' });
  });

  it('handles BOM at start of file', () => {
    const csv = '﻿name,email\nAlice,alice@x.com';
    const r = parseCsv(csv);
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows[0].name).toBe('Alice');
  });

  it('handles semicolon delimiter (Excel European export)', () => {
    const csv = 'name;email\nAlice;alice@x.com';
    const r = parseCsv(csv);
    expect(r.headers).toEqual(['name', 'email']);
    expect(r.rows[0].email).toBe('alice@x.com');
  });

  it('skips empty lines', () => {
    const csv = 'name,email\nAlice,alice@x.com\n\n\nBob,bob@x.com';
    const r = parseCsv(csv);
    expect(r.rows).toHaveLength(2);
  });

  it('trims whitespace from cells', () => {
    const csv = 'name,email\n  Alice  ,  alice@x.com  ';
    const r = parseCsv(csv);
    expect(r.rows[0]).toEqual({ name: 'Alice', email: 'alice@x.com' });
  });

  it('flags >500 rows as tooManyRows and slices to limit', () => {
    const lines = ['name'];
    for (let i = 0; i < 501; i++) lines.push(`Member ${i}`);
    const r = parseCsv(lines.join('\n'));
    expect(r.tooManyRows).toBe(true);
    expect(r.rowCount).toBe(501);
    expect(r.rows).toHaveLength(CSV_IMPORT_LIMITS.ROW_LIMIT);
  });
});

describe('autoMapColumns', () => {
  it('maps standard English headers', () => {
    expect(autoMapColumns(['Name', 'Email', 'Phone'])).toEqual({
      Name: 'name',
      Email: 'email',
      Phone: 'phone',
    });
  });

  it('handles aliases (full name, e-mail, mobile)', () => {
    const m = autoMapColumns(['Full Name', 'E-mail', 'Mobile']);
    expect(m['Full Name']).toBe('name');
    expect(m['E-mail']).toBe('email');
    expect(m['Mobile']).toBe('phone');
  });

  it('marks unknown headers as ignore', () => {
    const m = autoMapColumns(['Name', 'Department', 'Hire Date']);
    expect(m['Name']).toBe('name');
    expect(m['Department']).toBe('ignore');
    expect(m['Hire Date']).toBe('ignore');
  });

  it('does not assign the same field twice', () => {
    const m = autoMapColumns(['Name', 'Full Name']);
    const values = Object.values(m).filter((v) => v === 'name');
    expect(values).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(autoMapColumns(['NAME', 'EMAIL'])).toEqual({ NAME: 'name', EMAIL: 'email' });
  });
});

describe('validateRows', () => {
  const mapping = { name: 'name', email: 'email', phone: 'phone' } as const;

  it('flags rows with missing name + missing email', () => {
    const rows = [{ name: '', email: '', phone: '555-1' }];
    const v = validateRows(rows, mapping, new Set());
    expect(v.rows[0].errors).toContain('Missing name (and no email to fall back on)');
    expect(v.errorCount).toBe(1);
  });

  it('falls back to email local-part when name is empty', () => {
    const rows = [{ name: '', email: 'john@example.com', phone: '' }];
    const v = validateRows(rows, mapping, new Set());
    expect(v.rows[0].values.name).toBe('john');
    expect(v.rows[0].errors).toHaveLength(0);
  });

  it('flags malformed email', () => {
    const rows = [{ name: 'Alice', email: 'not-an-email', phone: '' }];
    const v = validateRows(rows, mapping, new Set());
    expect(v.rows[0].errors).toContain('Invalid email format');
  });

  it('detects duplicates within file by email (case-insensitive)', () => {
    const rows = [
      { name: 'Alice', email: 'alice@x.com', phone: '' },
      { name: 'Alice2', email: 'ALICE@x.com', phone: '' },
    ];
    const v = validateRows(rows, mapping, new Set());
    expect(v.rows[0].isDuplicateInFile).toBe(false);
    expect(v.rows[1].isDuplicateInFile).toBe(true);
    expect(v.duplicateInFileCount).toBe(1);
  });

  it('detects duplicates against existing DB emails', () => {
    const rows = [{ name: 'Alice', email: 'alice@x.com', phone: '' }];
    const v = validateRows(rows, mapping, new Set(['alice@x.com']));
    expect(v.rows[0].isDuplicateInDb).toBe(true);
    expect(v.duplicateInDbCount).toBe(1);
  });

  it('falls back to phone for dedup when email is missing', () => {
    const rows = [
      { name: 'Alice', email: '', phone: '555-1' },
      { name: 'Bob', email: '', phone: '555-1' },
    ];
    const v = validateRows(rows, mapping, new Set());
    expect(v.rows[1].isDuplicateInFile).toBe(true);
  });

  it('counts a clean row as valid', () => {
    const rows = [{ name: 'Alice', email: 'alice@x.com', phone: '' }];
    const v = validateRows(rows, mapping, new Set());
    expect(v.validCount).toBe(1);
    expect(v.errorCount).toBe(0);
  });
});

describe('rowsToCommit', () => {
  const mapping = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    company: 'contact',
  } as const;

  it('strips errors, dupes, and ignored rows', () => {
    const rows = [
      { name: 'Alice', email: 'alice@x.com', phone: '', company: 'Acme' },
      { name: '', email: '', phone: '', company: '' }, // error: missing name
      { name: 'Bob', email: 'alice@x.com', phone: '', company: '' }, // dup-in-file
      { name: 'Carol', email: 'carol@x.com', phone: '', company: '' }, // dup-in-db
    ];
    const v = validateRows(rows, mapping, new Set(['carol@x.com']));
    const out = rowsToCommit(v);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Alice');
    expect(out[0].contact).toBe('Acme');
  });

  it('nulls optional fields when absent', () => {
    const v = validateRows(
      [{ name: 'Alice', email: 'alice@x.com', phone: '', company: '' }],
      mapping,
      new Set(),
    );
    const out = rowsToCommit(v);
    expect(out[0].phone).toBeNull();
    expect(out[0].contact).toBeNull();
    expect(out[0].billingAddress).toBeNull();
  });
});
