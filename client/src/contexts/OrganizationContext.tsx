import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization, Room, OrgDesk, Desk } from '@shared/schema';
import { useUserOrganizations, useOrganizationRooms, useOrganizationDesks } from '@/hooks/use-organization';

const ORG_STORAGE_KEY = 'deskplanner-current-org';

interface OrganizationContextType {
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  rooms: Room[];
  desks: OrgDesk[];
  legacyDesks: Desk[];
  loading: boolean;
  hasOrganization: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ORG_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const { data: memberships = [], isLoading: orgsLoading } = useUserOrganizations();
  const currentOrg = memberships.find(m => m.organization.id === currentOrgId)?.organization
    || memberships[0]?.organization
    || null;

  const effectiveOrgId = currentOrg?.id;

  const { data: rooms = [], isLoading: roomsLoading } = useOrganizationRooms(effectiveOrgId);
  const { data: desks = [], isLoading: desksLoading } = useOrganizationDesks(effectiveOrgId);

  // Convert org desks to legacy Desk format for backward compatibility
  const legacyDesks: Desk[] = desks.map((d, i) => {
    const room = rooms.find(r => r.id === d.roomId);
    const roomIndex = room ? rooms.indexOf(room) + 1 : 1;
    return {
      id: d.deskId,
      room: roomIndex,
      number: i + 1,
      label: d.label,
    };
  });

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgId(org.id);
    try {
      localStorage.setItem(ORG_STORAGE_KEY, org.id);
    } catch {
      // ignore
    }
  };

  // Auto-select first org when memberships load
  useEffect(() => {
    if (!currentOrgId && memberships.length > 0) {
      setCurrentOrg(memberships[0].organization);
    }
  }, [memberships, currentOrgId]);

  const loading = orgsLoading || roomsLoading || desksLoading;
  const hasOrganization = memberships.length > 0;

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        setCurrentOrg,
        rooms,
        desks,
        legacyDesks,
        loading,
        hasOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
