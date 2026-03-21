import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Organization, Room, OrgDesk, Desk, OrgMemberRole, MeetingRoom } from '@shared/schema';
import { useUserOrganizations, useOrganizationRooms, useOrganizationDesks } from '@/hooks/use-organization';
import { useMeetingRooms } from '@/hooks/use-meeting-rooms';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const ORG_STORAGE_KEY = 'deskplanner-current-org';

interface OrganizationContextType {
  currentOrg: Organization | null;
  currentRole: OrgMemberRole | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization) => void;
  rooms: Room[];
  desks: OrgDesk[];
  legacyDesks: Desk[];
  meetingRooms: MeetingRoom[];
  hasMeetingRooms: boolean;
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
  const { user } = useAuth();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ORG_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const { data: memberships = [], isLoading: orgsLoading } = useUserOrganizations();
  const currentMembership = memberships.find(m => m.organization.id === currentOrgId)
    || memberships[0]
    || null;
  const currentOrg = currentMembership?.organization || null;
  const currentRole = (currentMembership?.role as OrgMemberRole) || null;

  const effectiveOrgId = currentOrg?.id;

  const { data: rooms = [], isLoading: roomsLoading } = useOrganizationRooms(effectiveOrgId);
  const { data: desks = [], isLoading: desksLoading } = useOrganizationDesks(effectiveOrgId);
  const { data: meetingRooms = [] } = useMeetingRooms(effectiveOrgId);

  // Convert org desks to legacy Desk format, sorted by room then desk order
  const legacyDesks: Desk[] = [...desks]
    .sort((a, b) => {
      const roomA = rooms.find(r => r.id === a.roomId);
      const roomB = rooms.find(r => r.id === b.roomId);
      const roomSortA = roomA ? rooms.indexOf(roomA) : 0;
      const roomSortB = roomB ? rooms.indexOf(roomB) : 0;
      if (roomSortA !== roomSortB) return roomSortA - roomSortB;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    })
    .map((d, i) => {
      const room = rooms.find(r => r.id === d.roomId);
      const roomIndex = room ? rooms.indexOf(room) + 1 : 1;
      return {
        id: d.deskId,
        room: roomIndex,
        number: i + 1,
        label: d.label,
        roomName: room?.name,
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

  // Heartbeat: update last_active_at once per session
  const heartbeatSent = useRef(false);
  useEffect(() => {
    if (!effectiveOrgId || !user?.id || heartbeatSent.current) return;
    heartbeatSent.current = true;
    supabaseClient
      .from('organization_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('organization_id', effectiveOrgId)
      .eq('user_id', user.id)
      .then(() => {});
  }, [effectiveOrgId, user?.id]);

  const loading = orgsLoading || roomsLoading || desksLoading;
  const hasOrganization = memberships.length > 0;
  const organizations = memberships.map(m => m.organization);
  const hasMeetingRooms = meetingRooms.length > 0;

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        currentRole,
        organizations,
        setCurrentOrg,
        rooms,
        desks,
        legacyDesks,
        meetingRooms,
        hasMeetingRooms,
        loading,
        hasOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
