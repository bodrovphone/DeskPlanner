import { useEffect, useState } from 'react';
import { localStorageMigration } from '@/lib/localStorageMigration';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface MigrationRunnerProps {
  onComplete: () => void;
  children: React.ReactNode;
}

interface MigrationState {
  isChecking: boolean;
  needsMigration: boolean;
  isRunning: boolean;
  completed: boolean;
  error: string | null;
  result: any;
}

export default function MigrationRunner({ onComplete, children }: MigrationRunnerProps) {
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isChecking: true,
    needsMigration: false,
    isRunning: false,
    completed: false,
    error: null,
    result: null
  });

  useEffect(() => {
    checkAndRunMigration();
  }, []);

  const checkAndRunMigration = async () => {
    try {
      console.log('Checking if localStorage migration is needed...');
      
      // Check migration status
      const status = localStorageMigration.getMigrationStatus();
      console.log('Migration status:', status);

      setMigrationState(prev => ({
        ...prev,
        isChecking: false,
        needsMigration: status.needsMigration
      }));

      if (status.needsMigration) {
        console.log('Migration needed, starting migration...');
        setMigrationState(prev => ({ ...prev, isRunning: true }));

        // Run migration
        const result = await localStorageMigration.runMigrations();
        console.log('Migration result:', result);

        if (result.success) {
          setMigrationState(prev => ({
            ...prev,
            isRunning: false,
            completed: true,
            result
          }));

          // Short delay to show success message
          setTimeout(() => {
            onComplete();
          }, 2000);
        } else {
          setMigrationState(prev => ({
            ...prev,
            isRunning: false,
            error: result.message,
            result
          }));
        }
      } else {
        console.log('No migration needed');
        onComplete();
      }
    } catch (error) {
      console.error('Migration check/run failed:', error);
      setMigrationState(prev => ({
        ...prev,
        isChecking: false,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Unknown migration error'
      }));
    }
  };

  const retryMigration = () => {
    setMigrationState({
      isChecking: true,
      needsMigration: false,
      isRunning: false,
      completed: false,
      error: null,
      result: null
    });
    checkAndRunMigration();
  };

  const skipMigration = () => {
    console.log('Skipping migration - continuing with app startup');
    onComplete();
  };

  // Show migration UI only if we're checking, running migration, or have completed/errored
  if (!migrationState.isChecking && !migrationState.needsMigration && !migrationState.error) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {migrationState.isChecking && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Checking Data Version
              </h2>
              <p className="text-gray-600 text-sm">
                Verifying your data compatibility...
              </p>
            </>
          )}

          {migrationState.isRunning && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upgrading Data
              </h2>
              <p className="text-gray-600 text-sm">
                Please wait while we update your data to the latest format...
              </p>
            </>
          )}

          {migrationState.completed && migrationState.result?.success && (
            <>
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upgrade Complete
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Your data has been successfully updated!
              </p>
              {migrationState.result.migratedItems.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    Migration Details:
                  </p>
                  <ul className="text-xs text-green-700 text-left space-y-1">
                    {migrationState.result.migratedItems.map((item: string, index: number) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {migrationState.error && (
            <>
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Migration Error
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                There was a problem updating your data format.
              </p>
              <div className="bg-red-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{migrationState.error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={retryMigration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Retry Migration
                </button>
                <button
                  onClick={skipMigration}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400"
                >
                  Skip & Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}