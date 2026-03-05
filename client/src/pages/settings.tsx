import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRenameRoom, useRenameDesk, useAddRoom, useSetRoomDeskCount } from '@/hooks/use-organization';
import { Building2, LayoutGrid, Save, Pencil, Plus, X } from 'lucide-react';
import { activeCurrencies, currencyLabels } from '@/lib/settings';

function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={className}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors text-left"
    >
      <span className={className}>{value}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  );
}

export default function SettingsPage() {
  const { currentOrg, rooms, desks } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [currency, setCurrency] = useState(currentOrg?.currency || 'EUR');
  const [defaultPrice, setDefaultPrice] = useState(currentOrg?.defaultPricePerDay?.toString() || '8');
  const renameRoom = useRenameRoom();
  const renameDesk = useRenameDesk();
  const addRoom = useAddRoom();
  const setRoomDeskCount = useSetRoomDeskCount();

  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesks, setNewRoomDesks] = useState(4);
  const newRoomInputRef = useRef<HTMLInputElement>(null);

  // Draft state for Rooms & Desks (buffered until Save)
  const [draftRoomNames, setDraftRoomNames] = useState<Record<string, string>>({});
  const [draftDeskLabels, setDraftDeskLabels] = useState<Record<string, string>>({});
  const [draftDeskCounts, setDraftDeskCounts] = useState<Record<string, number>>({});
  const [pendingNewRooms, setPendingNewRooms] = useState<Array<{ name: string; deskCount: number }>>([]);
  const [savingRooms, setSavingRooms] = useState(false);

  const hasOrgChanges =
    orgName !== (currentOrg?.name || '') ||
    currency !== (currentOrg?.currency || 'EUR') ||
    defaultPrice !== (currentOrg?.defaultPricePerDay?.toString() || '8');

  const hasRoomChanges =
    Object.keys(draftRoomNames).length > 0 ||
    Object.keys(draftDeskLabels).length > 0 ||
    Object.keys(draftDeskCounts).length > 0 ||
    pendingNewRooms.length > 0;

  useEffect(() => {
    if (addingRoom) {
      newRoomInputRef.current?.focus();
    }
  }, [addingRoom]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ name: orgName, currency, default_price_per_day: parseFloat(defaultPrice) || 8 })
        .eq('id', currentOrg.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Settings Saved', description: 'Organization name updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDraftRoomRename = (roomId: string, newName: string) => {
    const original = rooms.find((r) => r.id === roomId);
    if (original && newName === original.name) {
      setDraftRoomNames((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
    } else {
      setDraftRoomNames((prev) => ({ ...prev, [roomId]: newName }));
    }
  };

  const handleDraftDeskRename = (deskId: string, newLabel: string) => {
    const original = desks.find((d) => d.id === deskId);
    if (original && newLabel === original.label) {
      setDraftDeskLabels((prev) => { const next = { ...prev }; delete next[deskId]; return next; });
    } else {
      setDraftDeskLabels((prev) => ({ ...prev, [deskId]: newLabel }));
    }
  };

  const handleDraftDeskCountChange = (roomId: string, targetCount: number) => {
    const roomDesks = desks.filter((d) => d.roomId === roomId);
    if (targetCount === roomDesks.length) {
      setDraftDeskCounts((prev) => { const next = { ...prev }; delete next[roomId]; return next; });
    } else {
      setDraftDeskCounts((prev) => ({ ...prev, [roomId]: targetCount }));
    }
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return;
    setPendingNewRooms((prev) => [...prev, { name: newRoomName.trim(), deskCount: newRoomDesks }]);
    setAddingRoom(false);
    setNewRoomName('');
    setNewRoomDesks(4);
  };

  const handleRemovePendingRoom = (index: number) => {
    setPendingNewRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRooms = async () => {
    if (!currentOrg) return;
    setSavingRooms(true);
    try {
      const promises: Promise<void>[] = [];

      // Room renames
      for (const [roomId, newName] of Object.entries(draftRoomNames)) {
        promises.push(
          new Promise((resolve, reject) =>
            renameRoom.mutate({ roomId, newName }, { onSuccess: () => resolve(), onError: reject })
          )
        );
      }

      // Desk label renames
      for (const [deskId, newLabel] of Object.entries(draftDeskLabels)) {
        promises.push(
          new Promise((resolve, reject) =>
            renameDesk.mutate({ deskId, newLabel }, { onSuccess: () => resolve(), onError: reject })
          )
        );
      }

      // Desk count changes
      for (const [roomId, targetCount] of Object.entries(draftDeskCounts)) {
        const room = rooms.find((r) => r.id === roomId);
        const roomDesks = desks.filter((d) => d.roomId === roomId);
        if (room) {
          promises.push(
            new Promise((resolve, reject) =>
              setRoomDeskCount.mutate(
                { roomId, orgId: currentOrg.id, roomName: room.name, targetCount, currentDesks: roomDesks },
                {
                  onSuccess: () => resolve(),
                  onError: (err) => {
                    if (err instanceof Error && err.message === 'DESKS_HAVE_BOOKINGS') {
                      toast({ title: 'Cannot remove desks', description: 'Some desks have existing bookings.', variant: 'destructive' });
                    }
                    reject(err);
                  },
                },
              )
            )
          );
        }
      }

      // New rooms
      let maxSortOrder = rooms.reduce((max, r) => Math.max(max, r.sortOrder), -1);
      for (const newRoom of pendingNewRooms) {
        maxSortOrder += 1;
        const sortOrder = maxSortOrder;
        promises.push(
          new Promise((resolve, reject) =>
            addRoom.mutate(
              { orgId: currentOrg.id, name: newRoom.name, deskCount: newRoom.deskCount, sortOrder },
              { onSuccess: () => resolve(), onError: reject },
            )
          )
        );
      }

      await Promise.all(promises);

      // Clear draft state
      setDraftRoomNames({});
      setDraftDeskLabels({});
      setDraftDeskCounts({});
      setPendingNewRooms([]);
      toast({ title: 'Rooms & Desks Saved', description: 'All changes have been applied.' });
    } catch {
      toast({ title: 'Error', description: 'Some changes failed to save.', variant: 'destructive' });
    } finally {
      setSavingRooms(false);
    }
  };

  if (!currentOrg) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Organization</CardTitle>
            </div>
            <CardDescription>Manage your coworking space details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orgName">Space Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={currentOrg.slug} disabled />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation.</p>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeCurrencies.map(c => (
                    <SelectItem key={c} value={c}>{currencyLabels[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="defaultPrice">Default price per desk/day ({currency})</Label>
              <Input
                id="defaultPrice"
                type="number"
                min="0"
                step="0.01"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving || !hasOrgChanges}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-600" />
              <CardTitle>Rooms & Desks</CardTitle>
            </div>
            <CardDescription>Click any name to rename it. Change desk counts with the dropdown.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-3 flex-1">
              {rooms.map((room) => {
                const roomDesks = desks.filter((d) => d.roomId === room.id);
                const displayDeskCount = draftDeskCounts[room.id] ?? roomDesks.length;
                return (
                  <div key={room.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <InlineEdit
                        value={draftRoomNames[room.id] ?? room.name}
                        onSave={(newName) => handleDraftRoomRename(room.id, newName)}
                        className="font-medium text-gray-900"
                      />
                      <Select
                        value={String(displayDeskCount)}
                        onValueChange={(v) => handleDraftDeskCountChange(room.id, Number(v))}
                      >
                        <SelectTrigger className="w-28 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? 'desk' : 'desks'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {roomDesks.map((desk) => (
                        <div
                          key={desk.id}
                          className="px-2 py-1 bg-white border rounded text-xs text-gray-600"
                        >
                          <InlineEdit
                            value={draftDeskLabels[desk.id] ?? desk.label}
                            onSave={(newLabel) => handleDraftDeskRename(desk.id, newLabel)}
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Pending new rooms (not yet saved) */}
              {pendingNewRooms.map((newRoom, idx) => (
                <div key={`pending-${idx}`} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{newRoom.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{newRoom.deskCount} {newRoom.deskCount === 1 ? 'desk' : 'desks'}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleRemovePendingRoom(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">New — will be created on save</p>
                </div>
              ))}

              {addingRoom ? (
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-blue-300">
                  <div className="flex gap-2 items-center">
                    <Input
                      ref={newRoomInputRef}
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Room name"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRoomName.trim()) handleAddRoom();
                        if (e.key === 'Escape') { setAddingRoom(false); setNewRoomName(''); }
                      }}
                    />
                    <Select value={String(newRoomDesks)} onValueChange={(v) => setNewRoomDesks(Number(v))}>
                      <SelectTrigger className="w-28 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? 'desk' : 'desks'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleAddRoom} disabled={!newRoomName.trim()}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingRoom(false); setNewRoomName(''); }}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setAddingRoom(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Room
                </Button>
              )}

              {rooms.length === 0 && pendingNewRooms.length === 0 && !addingRoom && (
                <p className="text-sm text-gray-500">No rooms configured yet.</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleSaveRooms} disabled={!hasRoomChanges || savingRooms}>
                <Save className="mr-2 h-4 w-4" />
                {savingRooms ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
