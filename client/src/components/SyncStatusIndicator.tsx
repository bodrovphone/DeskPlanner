import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { HybridDataStore, SyncStatus } from '@/lib/hybridDataStore';
import { dataStore } from '@/lib/dataStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isHybridMode, setIsHybridMode] = useState(false);

  useEffect(() => {
    // Check if we're using hybrid storage
    if (dataStore instanceof HybridDataStore) {
      setIsHybridMode(true);
      
      // Get initial status
      setSyncStatus(dataStore.getSyncStatus());
      
      // Subscribe to status changes
      const unsubscribe = dataStore.onSyncStatusChange((status) => {
        setSyncStatus(status);
      });
      
      return unsubscribe;
    }
  }, []);

  if (!isHybridMode || !syncStatus) {
    return null;
  }

  const handleForceSync = async () => {
    if (dataStore instanceof HybridDataStore) {
      await dataStore.forceFullSync();
    }
  };

  const getStatusIcon = () => {
    if (syncStatus.syncInProgress) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (!syncStatus.isOnline) {
      return <CloudOff className="h-4 w-4" />;
    }
    if (syncStatus.lastSyncError) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (syncStatus.pendingChanges > 0) {
      return <Cloud className="h-4 w-4" />;
    }
    return <Check className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-500';
    if (syncStatus.lastSyncError) return 'text-red-500';
    if (syncStatus.pendingChanges > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline Mode';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.lastSyncError) return 'Sync Error';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} pending`;
    return 'Synced';
  };

  const getTooltipContent = () => {
    const lines = [];
    
    if (!syncStatus.isOnline) {
      lines.push('Running in offline mode (localStorage only)');
    } else {
      if (syncStatus.lastSyncTime) {
        const timeSince = Date.now() - syncStatus.lastSyncTime.getTime();
        const minutes = Math.floor(timeSince / 60000);
        const seconds = Math.floor((timeSince % 60000) / 1000);
        if (minutes > 0) {
          lines.push(`Last sync: ${minutes}m ${seconds}s ago`);
        } else {
          lines.push(`Last sync: ${seconds}s ago`);
        }
      } else {
        lines.push('Not synced yet');
      }
      
      if (syncStatus.pendingChanges > 0) {
        lines.push(`${syncStatus.pendingChanges} changes waiting to sync`);
      }
      
      if (syncStatus.lastSyncError) {
        lines.push(`Error: ${syncStatus.lastSyncError}`);
      }
    }
    
    return lines.join('\n');
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm cursor-help",
              "bg-white/50 backdrop-blur-sm border",
              syncStatus.lastSyncError ? "border-red-200" : "border-gray-200"
            )}
          >
            <span className={getStatusColor()}>
              {getStatusIcon()}
            </span>
            <span className="text-gray-700 text-xs font-medium">
              {getStatusText()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="whitespace-pre-line">
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
      
      {syncStatus.isOnline && (syncStatus.lastSyncError || syncStatus.pendingChanges > 5) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={handleForceSync}
              disabled={syncStatus.syncInProgress}
            >
              <RefreshCw className={cn(
                "h-3.5 w-3.5",
                syncStatus.syncInProgress && "animate-spin"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Force sync all data</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}