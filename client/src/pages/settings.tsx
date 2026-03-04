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
  const [defaultPrice, setDefaultPrice] = useState(currentOrg?.defaultPricePerDay?.toString() || '8');
  const renameRoom = useRenameRoom();
  const renameDesk = useRenameDesk();
  const addRoom = useAddRoom();
  const setRoomDeskCount = useSetRoomDeskCount();

  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesks, setNewRoomDesks] = useState(4);
  const newRoomInputRef = useRef<HTMLInputElement>(null);

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
        .update({ name: orgName, default_price_per_day: parseFloat(defaultPrice) || 8 })
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

  const handleRenameRoom = (roomId: string, newName: string) => {
    renameRoom.mutate(
      { roomId, newName },
      {
        onSuccess: () => toast({ title: 'Room renamed', description: `Room is now "${newName}".` }),
        onError: () => toast({ title: 'Error', description: 'Failed to rename room.', variant: 'destructive' }),
      },
    );
  };

  const handleRenameDesk = (deskId: string, newLabel: string) => {
    renameDesk.mutate(
      { deskId, newLabel },
      {
        onSuccess: () => toast({ title: 'Desk renamed', description: `Desk is now "${newLabel}".` }),
        onError: () => toast({ title: 'Error', description: 'Failed to rename desk.', variant: 'destructive' }),
      },
    );
  };

  const handleDeskCountChange = (roomId: string, roomName: string, targetCount: number) => {
    if (!currentOrg) return;
    const roomDesks = desks.filter((d) => d.roomId === roomId);
    setRoomDeskCount.mutate(
      { roomId, orgId: currentOrg.id, roomName, targetCount, currentDesks: roomDesks },
      {
        onSuccess: () => toast({ title: 'Desks updated', description: `Room now has ${targetCount} desk${targetCount !== 1 ? 's' : ''}.` }),
        onError: (err) => {
          if (err instanceof Error && err.message === 'DESKS_HAVE_BOOKINGS') {
            toast({ title: 'Cannot remove desks', description: 'Some desks have existing bookings. Remove or reassign bookings first.', variant: 'destructive' });
          } else {
            toast({ title: 'Error', description: 'Failed to update desk count.', variant: 'destructive' });
          }
        },
      },
    );
  };

  const handleAddRoom = () => {
    if (!currentOrg || !newRoomName.trim()) return;
    const maxSortOrder = rooms.reduce((max, r) => Math.max(max, r.sortOrder), -1);
    addRoom.mutate(
      { orgId: currentOrg.id, name: newRoomName.trim(), deskCount: newRoomDesks, sortOrder: maxSortOrder + 1 },
      {
        onSuccess: () => {
          toast({ title: 'Room added', description: `"${newRoomName.trim()}" created with ${newRoomDesks} desks.` });
          setAddingRoom(false);
          setNewRoomName('');
          setNewRoomDesks(4);
        },
        onError: () => toast({ title: 'Error', description: 'Failed to add room.', variant: 'destructive' }),
      },
    );
  };

  if (!currentOrg) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
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
              <Input value={currentOrg.currency} disabled />
            </div>
            <div>
              <Label htmlFor="defaultPrice">Default price per desk/day ({currentOrg.currency})</Label>
              <Input
                id="defaultPrice"
                type="number"
                min="0"
                step="0.01"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-600" />
              <CardTitle>Rooms & Desks</CardTitle>
            </div>
            <CardDescription>Click any name to rename it. Change desk counts with the dropdown.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rooms.map((room) => {
                const roomDesks = desks.filter((d) => d.roomId === room.id);
                return (
                  <div key={room.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <InlineEdit
                        value={room.name}
                        onSave={(newName) => handleRenameRoom(room.id, newName)}
                        className="font-medium text-gray-900"
                      />
                      <Select
                        value={String(roomDesks.length)}
                        onValueChange={(v) => handleDeskCountChange(room.id, room.name, Number(v))}
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
                            value={desk.label}
                            onSave={(newLabel) => handleRenameDesk(desk.id, newLabel)}
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

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
                    <Button size="sm" onClick={handleAddRoom} disabled={!newRoomName.trim() || addRoom.isPending}>
                      {addRoom.isPending ? 'Saving...' : 'Save'}
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

              {rooms.length === 0 && !addingRoom && (
                <p className="text-sm text-gray-500">No rooms configured yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
