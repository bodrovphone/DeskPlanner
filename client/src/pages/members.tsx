import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDataStore } from '@/contexts/DataStoreContext';
import { Client } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEFAULT_VISIBLE = 20;

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
    }, 800);

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
  const debouncedSave = useDebouncedSave(dataStore, toast);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // TODO: Currently loads all clients and filters locally. If member count grows
  // into the hundreds, switch to server-side search with debounced DB queries.
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => dataStore.getClients!(),
    enabled: !!dataStore.getClients,
  });

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

  const updateField = (id: string, field: 'name' | 'contact', value: string) => {
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Balance</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-1.5">
                      <input
                        ref={index === 0 ? newNameRef : undefined}
                        type="text"
                        value={client.name}
                        onChange={(e) => updateField(client.id, 'name', e.target.value)}
                        placeholder="Enter name..."
                        className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 placeholder-gray-300 focus:ring-0 py-1"
                      />
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
                      <span className="text-sm text-gray-400">0</span>
                    </td>
                    <td className="px-2 py-1.5">
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
