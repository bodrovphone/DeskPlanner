import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Client } from '@shared/schema';
import {
  parseCsv,
  autoMapColumns,
  validateRows,
  rowsToCommit,
  previewRows,
  IMPORTABLE_FIELD_LABELS,
  CSV_IMPORT_LIMITS,
  type ImportableField,
  type ParseResult,
  type ValidatedImport,
} from '@/lib/csvImport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClients: Client[];
}

type Step = 'upload' | 'map' | 'result';

interface ImportResult {
  attempted: number;
  created: number;
  failed: number;
  skippedErrors: number;
  skippedDuplicates: number;
  errorMessage: string | null;
}

export default function ImportMembersDialog({ open, onOpenChange, existingClients }: Props) {
  const dataStore = useDataStore();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportableField>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('upload');
      setCsvText('');
      setParseResult(null);
      setMapping({});
      setIsCommitting(false);
      setProgress(0);
      setResult(null);
    }
  }, [open]);

  const existingEmails = useMemo(() => {
    const set = new Set<string>();
    for (const c of existingClients) {
      if (c.email) set.add(c.email.toLowerCase());
    }
    return set;
  }, [existingClients]);

  const validated: ValidatedImport | null = useMemo(() => {
    if (!parseResult) return null;
    return validateRows(parseResult.rows, mapping, existingEmails);
  }, [parseResult, mapping, existingEmails]);

  const ignoredColumnCount = useMemo(() => {
    return Object.values(mapping).filter((v) => v === 'ignore').length;
  }, [mapping]);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast({
        title: 'Unsupported file',
        description: 'Please upload a .csv file. Excel files are not supported yet.',
        variant: 'destructive',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      processInput(text);
    };
    reader.readAsText(file);
  }

  function processInput(text: string) {
    const result = parseCsv(text);
    if (result.rows.length === 0) {
      toast({
        title: 'No rows found',
        description: 'The file looks empty or has no data rows below the header.',
        variant: 'destructive',
      });
      return;
    }
    setParseResult(result);
    setMapping(autoMapColumns(result.headers));
    setStep('map');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleCommit() {
    if (!validated || !currentOrg) return;
    const payload = rowsToCommit(validated);
    if (payload.length === 0) {
      toast({
        title: 'Nothing to import',
        description: 'No valid rows to commit. Fix errors or check duplicates.',
        variant: 'destructive',
      });
      return;
    }
    if (!dataStore.bulkCreateClients) {
      toast({
        title: 'Not supported',
        description: 'This data store does not support bulk import.',
        variant: 'destructive',
      });
      return;
    }

    setIsCommitting(true);
    setProgress(10);
    try {
      const { created, failed, firstError } = await dataStore.bulkCreateClients(payload);
      setProgress(100);
      setResult({
        attempted: payload.length,
        created,
        failed,
        skippedErrors: validated.errorCount,
        skippedDuplicates: validated.duplicateInDbCount + validated.duplicateInFileCount,
        errorMessage: firstError,
      });
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['clients', currentOrg.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast({
        title: 'Import failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import members from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Drop a CSV file or paste its contents below.'}
            {step === 'map' && 'Confirm column mapping and review rows before importing.'}
            {step === 'result' && 'Import complete.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-3">
                  Drop a .csv file here, or
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <p className="mt-3 text-xs text-gray-400">
                  Up to {CSV_IMPORT_LIMITS.ROW_LIMIT} rows. Comma, semicolon, or tab delimited.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Or paste CSV text
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={6}
                  placeholder="name,email,phone&#10;Alice,alice@example.com,555-1234&#10;Bob,bob@example.com,"
                  className="w-full font-mono text-xs border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={csvText.trim().length === 0}
                  onClick={() => processInput(csvText)}
                >
                  Parse pasted CSV
                </Button>
              </div>
            </div>
          )}

          {step === 'map' && parseResult && validated && (
            <div className="space-y-4 py-2">
              {parseResult.tooManyRows && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-900">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    File has {parseResult.rowCount} rows. Only the first{' '}
                    {CSV_IMPORT_LIMITS.ROW_LIMIT} will be imported. Split the file to import the
                    rest.
                  </span>
                </div>
              )}

              <div className="border border-gray-200 rounded-md">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                  Column mapping
                </div>
                <div className="divide-y divide-gray-100">
                  {parseResult.headers.map((header) => (
                    <div
                      key={header}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs text-gray-600 flex-1 truncate">
                        {header}
                      </span>
                      <span className="text-gray-300">→</span>
                      <Select
                        value={mapping[header] ?? 'ignore'}
                        onValueChange={(v) =>
                          setMapping((prev) => ({ ...prev, [header]: v as ImportableField }))
                        }
                      >
                        <SelectTrigger className="w-56 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(IMPORTABLE_FIELD_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {validated.validCount} valid
                </span>
                {validated.errorCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-700 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> {validated.errorCount}{' '}
                    {validated.errorCount === 1 ? 'error' : 'errors'}
                  </span>
                )}
                {validated.duplicateInDbCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {validated.duplicateInDbCount} already in members
                  </span>
                )}
                {validated.duplicateInFileCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {validated.duplicateInFileCount}{' '}
                    {validated.duplicateInFileCount === 1
                      ? 'duplicate in file'
                      : 'duplicates in file'}
                  </span>
                )}
                {ignoredColumnCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {ignoredColumnCount} column{ignoredColumnCount === 1 ? '' : 's'} ignored
                  </span>
                )}
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600 w-8">#</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Email</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Phone</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows(validated).map((row) => {
                      const hasError = row.errors.length > 0;
                      const isDup = row.isDuplicateInDb || row.isDuplicateInFile;
                      return (
                        <tr
                          key={row.index}
                          className={
                            hasError
                              ? 'bg-red-50'
                              : isDup
                              ? 'bg-gray-50 text-gray-400'
                              : ''
                          }
                        >
                          <td className="px-2 py-1 text-gray-400">{row.index + 1}</td>
                          <td className="px-2 py-1 truncate max-w-[180px]">
                            {row.values.name ?? '—'}
                          </td>
                          <td className="px-2 py-1 truncate max-w-[200px]">
                            {row.values.email ?? '—'}
                          </td>
                          <td className="px-2 py-1 truncate max-w-[120px]">
                            {row.values.phone ?? '—'}
                          </td>
                          <td className="px-2 py-1">
                            {hasError ? (
                              <span className="text-red-700">{row.errors[0]}</span>
                            ) : row.isDuplicateInDb ? (
                              <span>Already exists</span>
                            ) : row.isDuplicateInFile ? (
                              <span>Duplicate in file</span>
                            ) : (
                              <span className="text-emerald-700">Ready</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {validated.rows.length > CSV_IMPORT_LIMITS.PREVIEW_LIMIT && (
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                    Showing first {CSV_IMPORT_LIMITS.PREVIEW_LIMIT} rows of{' '}
                    {validated.rows.length}
                  </div>
                )}
              </div>

              {isCommitting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-xs text-gray-500 text-center">Importing…</p>
                </div>
              )}
            </div>
          )}

          {step === 'result' && result && (
            <div className="py-6 space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Imported {result.created} member{result.created === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {(result.skippedErrors > 0 || result.skippedDuplicates > 0) &&
                    `Skipped ${result.skippedErrors + result.skippedDuplicates} row${
                      result.skippedErrors + result.skippedDuplicates === 1 ? '' : 's'
                    }`}
                  {result.skippedErrors > 0 &&
                    ` (${result.skippedErrors} with errors`}
                  {result.skippedErrors > 0 && result.skippedDuplicates > 0 && ', '}
                  {result.skippedDuplicates > 0 &&
                    `${result.skippedDuplicates} duplicate${
                      result.skippedDuplicates === 1 ? '' : 's'
                    }`}
                  {(result.skippedErrors > 0 || result.skippedDuplicates > 0) &&
                    (result.skippedErrors > 0 ? ')' : ')')}
                </p>
                {result.failed > 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    {result.failed} row{result.failed === 1 ? '' : 's'} failed to insert.
                    {result.errorMessage ? ` ${result.errorMessage}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 'map' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setParseResult(null);
                  setStep('upload');
                }}
                disabled={isCommitting}
              >
                Back
              </Button>
              <Button
                onClick={handleCommit}
                disabled={isCommitting || !validated || validated.validCount === 0}
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Importing
                  </>
                ) : (
                  <>
                    Import {validated?.validCount ?? 0}{' '}
                    {(validated?.validCount ?? 0) === 1 ? 'member' : 'members'}
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
