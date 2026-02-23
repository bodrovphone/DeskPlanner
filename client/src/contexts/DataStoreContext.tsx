import React, { createContext, useContext, useMemo } from 'react';
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

  const store = useMemo(
    () => createDataStore(undefined, currentOrg?.id),
    [currentOrg?.id]
  );

  return (
    <DataStoreContext.Provider value={store}>
      {children}
    </DataStoreContext.Provider>
  );
}
