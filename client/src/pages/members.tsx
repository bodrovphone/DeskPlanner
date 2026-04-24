import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDataStore } from '@/contexts/DataStoreContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Client } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, Users, Search, X, Copy, Check, Link as LinkIcon, Package, Play, Snowflake, Infinity as InfinityIcon, CreditCard, FileText } from 'lucide-react';
import { DeskBooking, PaymentMethodType } from '@shared/schema';
import { formatLocalDate } from '@/lib/dateUtils';
import ReactivationModal from '@/components/members/ReactivationModal';
import MemberProfileDialog from '@/components/members/MemberProfileDialog';
import InvoiceEditorDialog from '@/components/invoices/InvoiceEditorDialog';
import MemberInvoicesDialog from '@/components/invoices/MemberInvoicesDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabaseClient } from '@/lib/supabaseClient';

const DEFAULT_VISIBLE = 20;

interface PlanState {
  activeDaysLeft: number;
  bankedDays: number;
  bankedBookings: DeskBooking[];
  activeEndDate: string | null;
  planType: 'weekly' | 'monthly' | null;
  isPaused: boolean;
  isOngoing: boolean;
}

interface BalanceCellProps {
  client: Client;
  planState: PlanState | undefined;
  flexConfigured: boolean;
  orgSlug: string | undefined;
  onActivateFlex: (client: Client) => void;
  onReactivate: (client: Client, banked: DeskBooking[]) => void;
  onCopyLink: (link: string, clientName: string) => void;
}

function BalanceCell({
  client,
  planState,
  flexConfigured,
  orgSlug,
  onActivateFlex,
  onReactivate,
  onCopyLink,
}: BalanceCellProps) {
  const hasFlex = flexConfigured && client.flexActive;
  const hasActivePlan = !!planState && planState.activeDaysLeft > 0;
  const hasBankedPlan = !!planState && planState.bankedDays > 0;
  const isOngoingPlan = !!planState && planState.isOngoing;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasBankedPlan && !isOngoingPlan && (
        <div className="inline-flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {planState!.bankedDays}d left
          </span>
          <button
            onClick={() => onReactivate(client, planState!.bankedBookings)}
            className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Reactivate
          </button>
        </div>
      )}
      {isOngoingPlan && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700">
          <InfinityIcon className="h-3 w-3" />
          Ongoing
        </span>
      )}
      {hasActivePlan && !hasBankedPlan && !isOngoingPlan && (
        <span className="text-sm font-medium text-emerald-700">
          {planState!.activeDaysLeft} day{planState!.activeDaysLeft === 1 ? '' : 's'} left
        </span>
      )}
      {hasFlex && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onActivateFlex(client)}
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            {client.flexTotalDays - client.flexUsedDays}/{client.flexTotalDays}
          </button>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    const link = `${window.location.origin}/book/${client.id}/${orgSlug}`;
                    await navigator.clipboard.writeText(link);
                    onCopyLink(link, client.name);
                  }}
                  className="px-1.5 py-0.5 rounded text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  Copy link
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center">
                <p>Copy this member's personal booking link to share via messenger or email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {flexConfigured && !client.flexActive && !hasActivePlan && !hasBankedPlan && (
        <button
          type="button"
          onClick={() => onActivateFlex(client)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-gray-300 bg-white text-gray-500 text-xs font-medium hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <Package className="h-3 w-3" />
          Activate Flex
        </button>
      )}
    </div>
  );
}

function useDebouncedSave(dataStore: ReturnType<typeof useDataStore>, toast: ReturnType<typeof useToast>['toast']) {
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const save = useCallback((client: Client) => {
    const existing = timers.current.get(client.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      timers.current.delete(client.id);
      try {
        await dataStore.saveClient!(client);
        toast({ title: 'Saved', description: `${client.name || 'Client'} updated`, duration: 1500 });
      } catch {
        toast({ title: 'Failed to save', description: 'Changes could not be saved', variant: 'destructive', duration: 2000 });
      }
    }, 1500);

    timers.current.set(client.id, timer);
  }, [dataStore, toast]);

  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return save;
}

export default function MembersPage() {
  const dataStore = useDataStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrg, organizations } = useOrganization();
  const orgNameById = useMemo(() => {
    const map: Record<string, string> = {};
    organizations.forEach(o => { map[o.id] = o.name; });
    return map;
  }, [organizations]);
  const debouncedSave = useDebouncedSave(dataStore, toast);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [flexActivateTarget, setFlexActivateTarget] = useState<Client | null>(null);
  const [flexActivatedLink, setFlexActivatedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState<{ client: Client; banked: DeskBooking[] } | null>(null);
  const [profileTarget, setProfileTarget] = useState<Client | null>(null);
  // FileText button opens the per-member invoices list. From there, "+ New invoice"
  // closes the list and opens the editor on the same client.
  const [invoicesListTarget, setInvoicesListTarget] = useState<Client | null>(null);
  const [invoiceEditorTarget, setInvoiceEditorTarget] = useState<Client | null>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const today = formatLocalDate(new Date());

  const flexConfigured = !!(currentOrg?.flexPlanDays && currentOrg.flexPlanDays > 0 && currentOrg?.flexPlanPrice && currentOrg.flexPlanPrice > 0);

  // TODO: Currently loads all clients and filters locally. If member count grows
  // into the hundreds, switch to server-side search with debounced DB queries.
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => dataStore.getClients!(),
    enabled: !!dataStore.getClients,
  });

  const { data: planBookings } = useQuery({
    queryKey: ['org-plan-bookings'],
    queryFn: () => dataStore.getOrgPlanBookings!(),
    enabled: !!dataStore.getOrgPlanBookings,
  });

  const planStateByClient = useMemo(() => {
    const map = new Map<string, PlanState>();
    for (const b of planBookings ?? []) {
      if (!b.clientId) continue;
      const entry = map.get(b.clientId) ?? {
        activeDaysLeft: 0,
        bankedDays: 0,
        bankedBookings: [],
        activeEndDate: null,
        planType: null,
        isPaused: false,
        isOngoing: false,
      };
      const pt = b.planType === 'weekly' || b.planType === 'monthly' ? b.planType : null;
      if (pt && !entry.planType) entry.planType = pt;
      if (b.pausedAt) {
        entry.bankedDays += 1;
        entry.bankedBookings.push(b);
        entry.isPaused = true;
      } else if (!b.isFrozen && b.date >= today) {
        entry.activeDaysLeft += 1;
        if (!entry.activeEndDate || b.endDate > entry.activeEndDate) {
          entry.activeEndDate = b.endDate;
        }
        if (b.isOngoing) entry.isOngoing = true;
      }
      map.set(b.clientId, entry);
    }
    return map;
  }, [planBookings, today]);

  useEffect(() => {
    if (clients) setLocalClients(clients);
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return localClients;
    const q = search.toLowerCase();
    return localClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contact && c.contact.toLowerCase().includes(q))
    );
  }, [localClients, search]);

  const isSearching = search.trim().length > 0;
  const visibleClients = isSearching || showAll
    ? filteredClients
    : filteredClients.slice(0, DEFAULT_VISIBLE);
  const hasMore = !isSearching && !showAll && filteredClients.length > DEFAULT_VISIBLE;

  const updateField = (id: string, field: 'name' | 'contact' | 'email', value: string) => {
    setLocalClients(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, [field]: value } : c);
      const client = updated.find(c => c.id === id);
      if (client && client.name.trim()) {
        debouncedSave(client);
      }
      return updated;
    });
  };

  const handleAddNew = async () => {
    if (!dataStore.saveClient) return;
    setAddingNew(true);
    try {
      const newClient = await dataStore.saveClient({
        id: 'new-' + Date.now(),
        organizationId: '',
        name: '',
        flexActive: false,
        flexTotalDays: 0,
        flexUsedDays: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLocalClients(prev => [newClient, ...prev]);
      setSearch('');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setTimeout(() => newNameRef.current?.focus(), 50);
    } catch {
      toast({ title: 'Failed', description: 'Could not create member', variant: 'destructive' });
    } finally {
      setAddingNew(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !dataStore.deleteClient) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await dataStore.deleteClient(id);
      setLocalClients(prev => prev.filter(c => c.id !== id));
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Deleted', description: 'Member removed', duration: 1500 });
    } catch {
      toast({ title: 'Failed', description: 'Could not delete member', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          {!isLoading && (
            <span className="text-sm text-gray-400">({localClients.length})</span>
          )}
        </div>
        <Button
          onClick={handleAddNew}
          disabled={addingNew}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {addingNew ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4 mr-1.5" />
          )}
          Add Member
        </Button>
      </div>

      {!isLoading && localClients.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
            placeholder="Search by name or contact..."
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : localClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">No members yet</p>
          <p className="text-sm text-gray-400">Members are created automatically when you book a desk, or you can add them here.</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No members matching "{search}"</p>
        </div>
      ) : (
        <>
          {flexConfigured && (
            <div className="flex items-center gap-2 mb-3 px-1 text-xs text-gray-400">
              <Package className="h-3.5 w-3.5 text-amber-500" />
              <span>Flex plan: {currentOrg?.flexPlanDays} days for {currentOrg?.currency} {currentOrg?.flexPlanPrice}. Click "Activate Flex" next to a member, then share the booking link with them.</span>
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-48">Balance</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={index === 0 ? newNameRef : undefined}
                          type="text"
                          value={client.name}
                          onChange={(e) => updateField(client.id, 'name', e.target.value)}
                          placeholder="Enter name..."
                          className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder-gray-300 focus:ring-0 py-1"
                        />
                        {currentOrg?.groupId && client.organizationId !== currentOrg.id && (
                          <span className="shrink-0 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                            {orgNameById[client.organizationId] ?? 'Other location'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={client.contact || ''}
                        onChange={(e) => updateField(client.id, 'contact', e.target.value)}
                        placeholder="Email, phone, etc."
                        className="w-full bg-transparent border-0 outline-none text-sm text-gray-600 placeholder-gray-300 focus:ring-0 py-1"
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="email"
                        value={client.email || ''}
                        onChange={(e) => updateField(client.id, 'email', e.target.value)}
                        placeholder="member@email.com"
                        className="w-full bg-transparent border-0 outline-none text-sm text-gray-600 placeholder-gray-300 focus:ring-0 py-1"
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      {(() => {
                        const ps = planStateByClient.get(client.id);
                        const label = ps?.planType === 'weekly' ? 'Weekly'
                          : ps?.planType === 'monthly' ? 'Monthly'
                          : client.flexActive ? 'Flex'
                          : null;
                        if (!label) return null;
                        return ps?.isPaused ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <Snowflake className="h-3 w-3" />
                            {label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium">{label}</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-1.5">
                      <BalanceCell
                        client={client}
                        planState={planStateByClient.get(client.id)}
                        flexConfigured={flexConfigured}
                        orgSlug={currentOrg?.slug}
                        onActivateFlex={setFlexActivateTarget}
                        onReactivate={(c, banked) => setReactivateTarget({ client: c, banked })}
                        onCopyLink={(_link, clientName) => toast({ title: 'Link copied', description: `Booking link for ${clientName} copied.`, duration: 1500 })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setProfileTarget(client)}
                          className={`p-1.5 rounded transition-colors ${
                            client.billingAddress || client.paymentMethodType
                              ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                              : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'
                          }`}
                          title={
                            client.billingAddress || client.paymentMethodType
                              ? 'Billing details'
                              : 'Add billing details'
                          }
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setInvoicesListTarget(client)}
                          className="p-1.5 rounded transition-colors text-gray-300 hover:text-blue-500 hover:bg-blue-50"
                          title="Invoices"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(client)}
                          disabled={deletingId === client.id}
                          className="p-1.5 rounded transition-colors text-gray-300 hover:text-red-500 hover:bg-red-50"
                          title="Delete member"
                        >
                          {deletingId === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Show all {filteredClients.length} members
            </button>
          )}
        </>
      )}
      <AlertDialog
        open={!!flexActivateTarget || !!flexActivatedLink}
        onOpenChange={(open) => {
          if (!open) {
            setFlexActivateTarget(null);
            setFlexActivatedLink(null);
            setLinkCopied(false);
          }
        }}
      >
        <AlertDialogContent>
          {flexActivatedLink ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Flex plan activated</AlertDialogTitle>
                <AlertDialogDescription>
                  Share this personal booking link with the member. They can use it to self-book and their balance will be tracked automatically.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-2 flex gap-2">
                <Input value={flexActivatedLink} readOnly className="text-sm bg-gray-50 flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(flexActivatedLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => { setFlexActivatedLink(null); setLinkCopied(false); }}>
                  Done
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {flexActivateTarget?.flexActive ? 'Reset flex plan' : 'Activate flex plan'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {flexActivateTarget?.flexActive
                    ? `Reset the flex plan for "${flexActivateTarget?.name}"? This will start a new ${currentOrg?.flexPlanDays}-day plan.`
                    : `Activate flex plan for "${flexActivateTarget?.name}"? They will get ${currentOrg?.flexPlanDays} days starting today.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!flexActivateTarget || !dataStore.saveClient || !currentOrg?.flexPlanDays) return;
                    try {
                      const updated: Client = {
                        ...flexActivateTarget,
                        flexActive: true,
                        flexTotalDays: currentOrg.flexPlanDays,
                        flexUsedDays: 0,
                        flexStartDate: new Date().toISOString().split('T')[0],
                      };
                      await dataStore.saveClient(updated);
                      setLocalClients(prev => prev.map(c => c.id === updated.id ? updated : c));
                      queryClient.invalidateQueries({ queryKey: ['clients'] });

                      // Generate booking link and show it
                      const link = `${window.location.origin}/book/${updated.id}/${currentOrg.slug}`;
                      setFlexActivatedLink(link);
                      setFlexActivateTarget(null);

                      // Fire-and-forget activation email
                      if (updated.email) {
                        supabaseClient.functions.invoke('flex-email', {
                          body: { type: 'activation', clientId: parseInt(updated.id, 10), organizationId: currentOrg.id },
                        }).catch(() => {});
                      }
                    } catch {
                      toast({ title: 'Failed', description: 'Could not activate flex plan.', variant: 'destructive' });
                      setFlexActivateTarget(null);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {flexActivateTarget?.flexActive ? 'Reset' : 'Activate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <ReactivationModal
        isOpen={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        client={reactivateTarget?.client ?? null}
        bankedBookings={reactivateTarget?.banked ?? []}
      />

      {currentOrg && (
        <MemberInvoicesDialog
          isOpen={!!invoicesListTarget}
          onClose={() => setInvoicesListTarget(null)}
          client={invoicesListTarget}
          organization={currentOrg}
          onCreateNew={() => {
            const target = invoicesListTarget;
            setInvoicesListTarget(null);
            // Small delay so the closing animation doesn't collide with the editor opening.
            setTimeout(() => setInvoiceEditorTarget(target), 120);
          }}
        />
      )}
      {currentOrg && (
        <InvoiceEditorDialog
          isOpen={!!invoiceEditorTarget}
          onClose={() => setInvoiceEditorTarget(null)}
          client={invoiceEditorTarget}
          organization={currentOrg}
        />
      )}

      <MemberProfileDialog
        isOpen={!!profileTarget}
        onClose={() => setProfileTarget(null)}
        client={profileTarget}
        onSave={async ({ billingAddress, paymentMethodType, representativeName, taxId, vatId }) => {
          if (!profileTarget || !dataStore.saveClient) return;
          try {
            const updated: Client = {
              ...profileTarget,
              billingAddress,
              paymentMethodType: paymentMethodType as PaymentMethodType | null,
              representativeName,
              taxId,
              vatId,
            };
            const saved = await dataStore.saveClient(updated);
            setLocalClients(prev => prev.map(c => c.id === saved.id ? saved : c));
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            toast({ title: 'Saved', description: 'Billing details updated.', duration: 1500 });
          } catch {
            toast({ title: 'Failed', description: 'Could not update billing details.', variant: 'destructive' });
          }
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name ? `"${deleteTarget.name}"` : 'this member'}? This will unlink them from any bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
