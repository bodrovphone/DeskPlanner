import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IDataStore, createDataStore } from '@/lib/dataStore';
import { useOrganization } from '@/contexts/OrganizationContext';

const DataStoreContext = createContext<IDataStore | undefined>(undefined);

export function useDataStore(): IDataStore {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
}

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const prevOrgId = useRef(currentOrg?.id);

  const store = useMemo(
    () => createDataStore(undefined, currentOrg?.id),
    [currentOrg?.id]
  );

  // Clear all org-scoped query caches when the organization changes
  useEffect(() => {
    if (prevOrgId.current !== currentOrg?.id && prevOrgId.current !== undefined) {
      queryClient.removeQueries({ queryKey: ['desk-bookings'] });
      queryClient.removeQueries({ queryKey: ['desk-stats'] });
      queryClient.removeQueries({ queryKey: ['next-dates'] });
      queryClient.removeQueries({ queryKey: ['monthly-stats'] });
      queryClient.removeQueries({ queryKey: ['expenses'] });
      queryClient.removeQueries({ queryKey: ['recurring-expenses'] });
      queryClient.removeQueries({ queryKey: ['date-range-stats'] });
    }
    prevOrgId.current = currentOrg?.id;
  }, [currentOrg?.id, queryClient]);

  return (
    <DataStoreContext.Provider value={store}>
      {children}
    </DataStoreContext.Provider>
  );
}
