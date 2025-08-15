import React, { useState } from 'react';
import { LocalStorageToSupabaseMigration, MigrationResult } from '@/lib/migrationUtility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Download, Upload, Database, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

export function DataMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [clearAfterMigration, setClearAfterMigration] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<{
    localStorageCount: number;
    supabaseCount: number;
    matched: boolean;
  } | null>(null);

  const handleBackup = () => {
    try {
      const migration = new LocalStorageToSupabaseMigration();
      const backupData = migration.createBackup();
      
      // Create and download backup file
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deskplanner-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to create backup');
    }
  };

  const handleDryRun = async () => {
    try {
      setMigrationStatus('running');
      setProgress(50);
      
      const migration = new LocalStorageToSupabaseMigration();
      const result = await migration.migrate({ dryRun: true });
      
      setProgress(100);
      setMigrationResult(result);
      setMigrationStatus(result.success ? 'success' : 'error');
    } catch (error) {
      console.error('Dry run failed:', error);
      setMigrationStatus('error');
      setMigrationResult({
        success: false,
        bookingsMigrated: 0,
        waitingListMigrated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const handleMigration = async () => {
    try {
      setMigrationStatus('running');
      setProgress(0);
      
      const migration = new LocalStorageToSupabaseMigration();
      
      // Start migration
      setProgress(30);
      const result = await migration.migrate({ 
        clearLocalStorageAfter: clearAfterMigration,
        dryRun: false 
      });
      
      setProgress(70);
      
      // Verify migration
      const verification = await migration.verifyMigration();
      setVerificationResult(verification);
      
      setProgress(100);
      setMigrationResult(result);
      setMigrationStatus(result.success ? 'success' : 'error');
      
      // Reload the page if successful and localStorage was cleared
      if (result.success && clearAfterMigration) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
      setMigrationResult({
        success: false,
        bookingsMigrated: 0,
        waitingListMigrated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Migration Tool
        </CardTitle>
        <CardDescription>
          Migrate your data from localStorage to Supabase database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupabaseConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Migration in progress...</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {migrationResult && migrationStatus !== 'running' && (
          <Alert variant={migrationResult.success ? 'default' : 'destructive'}>
            {migrationResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-1 mt-2">
                <p>Bookings migrated: {migrationResult.bookingsMigrated}</p>
                <p>Waiting list entries migrated: {migrationResult.waitingListMigrated}</p>
                {migrationResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Errors:</p>
                    <ul className="list-disc list-inside text-sm">
                      {migrationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {verificationResult && (
          <Alert variant={verificationResult.matched ? 'default' : 'destructive'}>
            <AlertTitle>Verification Result</AlertTitle>
            <AlertDescription>
              <p>LocalStorage records: {verificationResult.localStorageCount}</p>
              <p>Supabase records: {verificationResult.supabaseCount}</p>
              <p>Status: {verificationResult.matched ? '✅ Counts match' : '⚠️ Counts do not match'}</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="clear-storage" 
            checked={clearAfterMigration}
            onCheckedChange={(checked) => setClearAfterMigration(checked as boolean)}
            disabled={migrationStatus === 'running'}
          />
          <label 
            htmlFor="clear-storage" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Clear localStorage after successful migration
          </label>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleBackup}
            variant="outline"
            disabled={migrationStatus === 'running'}
          >
            <Download className="mr-2 h-4 w-4" />
            Backup Data
          </Button>

          <Button
            onClick={handleDryRun}
            variant="outline"
            disabled={migrationStatus === 'running' || !isSupabaseConfigured}
          >
            Dry Run
          </Button>

          <Button
            onClick={handleMigration}
            disabled={migrationStatus === 'running' || !isSupabaseConfigured}
          >
            <Upload className="mr-2 h-4 w-4" />
            Start Migration
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Create a backup before migrating your data</p>
          <p>• Use "Dry Run" to preview what will be migrated</p>
          <p>• The migration will convert string IDs to numeric IDs automatically</p>
          <p>• Existing data in Supabase will be updated if IDs match</p>
        </div>
      </CardContent>
    </Card>
  );
}