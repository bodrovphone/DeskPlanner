import { useState, useRef, useEffect, useCallback } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRenameRoom, useRenameDesk, useAddRoom, useSetRoomDeskCount } from '@/hooks/use-organization';
import { useTelegramSettings, useConnectTelegram, useDisconnectTelegram, useToggleNotifications, useManualConnect } from '@/hooks/use-telegram';
import { Building2, LayoutGrid, Save, Pencil, Plus, X, Bell, Send, Unplug, ChevronDown, Globe, Copy, Check, Upload, Trash2, RefreshCw, ImageIcon } from 'lucide-react';
import { activeCurrencies, currencyLabels } from '@/lib/settings';
import { DAY_LABELS } from '@/lib/workingDays';

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
  const { currentOrg, currentRole, rooms, desks } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [currency, setCurrency] = useState(currentOrg?.currency || 'EUR');
  const [defaultPrice, setDefaultPrice] = useState(currentOrg?.defaultPricePerDay?.toString() || '8');
  const [workingDays, setWorkingDays] = useState<number[]>(currentOrg?.workingDays || [1, 2, 3, 4, 5]);
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

  const toggleWorkingDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const hasOrgChanges =
    orgName !== (currentOrg?.name || '') ||
    currency !== (currentOrg?.currency || 'EUR') ||
    defaultPrice !== (currentOrg?.defaultPricePerDay?.toString() || '8') ||
    JSON.stringify(workingDays) !== JSON.stringify(currentOrg?.workingDays || [1, 2, 3, 4, 5]);

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
        .update({ name: orgName, currency, default_price_per_day: parseFloat(defaultPrice) || 8, working_days: workingDays })
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
              <div className="flex gap-2">
                {activeCurrencies.map(c => (
                  <Button
                    key={c}
                    type="button"
                    variant={currency === c ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrency(c)}
                  >
                    {currencyLabels[c] || c}
                  </Button>
                ))}
                <Input
                  value={activeCurrencies.includes(currency) ? '' : currency}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
                    if (val) setCurrency(val);
                  }}
                  placeholder="Other (e.g. RSD)"
                  className="w-32"
                  maxLength={3}
                />
              </div>
              {currency && !activeCurrencies.includes(currency) && currency.length === 3 && (
                <p className="text-xs text-blue-600 mt-1">Using custom currency: {currency}</p>
              )}
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
            <div>
              <Label>Working Days</Label>
              <p className="text-xs text-gray-500 mb-2">Select which days your space is open for bookings.</p>
              <div className="flex gap-1.5">
                {([1, 2, 3, 4, 5, 6, 7] as const).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkingDay(day)}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                      workingDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
            <LogoUploadInline orgId={currentOrg.id} logoUrl={currentOrg.logoUrl ?? null} />
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

        <TelegramNotificationsCard
          orgId={currentOrg.id}
          isAdmin={currentRole === 'owner' || currentRole === 'admin'}
        />

        <PublicBookingCard
          orgId={currentOrg.id}
          orgSlug={currentOrg.slug}
          isAdmin={currentRole === 'owner' || currentRole === 'admin'}
          enabled={currentOrg.publicBookingEnabled}
          maxDaysAhead={currentOrg.publicBookingMaxDaysAhead}
        />
      </div>
    </div>
  );
}

function TelegramNotificationsCard({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useTelegramSettings(orgId);
  const connectTelegram = useConnectTelegram();
  const disconnectTelegram = useDisconnectTelegram();
  const toggleNotifications = useToggleNotifications();
  const manualConnect = useManualConnect();

  const [polling, setPolling] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount or when connected
  useEffect(() => {
    if (settings?.telegramChatId && polling) {
      setPolling(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      toast({ title: 'Connected', description: 'Telegram notifications are now active.' });
    }
  }, [settings?.telegramChatId, polling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    setPolling(true);
    // Poll every 3s for up to 5min
    let elapsed = 0;
    pollRef.current = setInterval(() => {
      elapsed += 3000;
      queryClient.invalidateQueries({ queryKey: ['telegram-settings', orgId] });
      if (elapsed >= 300000) {
        setPolling(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 3000);
  }, [orgId, queryClient]);

  const handleConnect = async () => {
    try {
      // iOS Safari workaround: pre-open window before async call
      const win = window.open('about:blank', '_blank');
      const result = await connectTelegram.mutateAsync(orgId);
      if (win) {
        win.location.href = result.botLink;
      } else {
        window.open(result.botLink, '_blank');
      }
      startPolling();
    } catch {
      toast({ title: 'Error', description: 'Failed to generate connection link.', variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectTelegram.mutateAsync(orgId);
      toast({ title: 'Disconnected', description: 'Telegram notifications disabled.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect.', variant: 'destructive' });
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleNotifications.mutateAsync({ orgId, enabled });
    } catch {
      toast({ title: 'Error', description: 'Failed to update notifications.', variant: 'destructive' });
    }
  };

  const handleManualConnect = async () => {
    const chatId = parseInt(manualChatId.trim(), 10);
    if (!chatId || isNaN(chatId)) {
      toast({ title: 'Invalid Chat ID', description: 'Please enter a valid numeric Chat ID.', variant: 'destructive' });
      return;
    }
    try {
      await manualConnect.mutateAsync({ orgId, chatId });
      setManualChatId('');
      setShowManual(false);
      toast({ title: 'Connected', description: 'Telegram connected via Chat ID.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to connect. Make sure the Chat ID is correct.', variant: 'destructive' });
    }
  };

  const handleSendTest = async () => {
    try {
      const { data, error } = await supabaseClient.functions.invoke('telegram-notify', {
        body: {},
      });
      if (error) throw error;
      if (data?.totalSent > 0) {
        toast({ title: 'Test Sent', description: 'Check your Telegram for a test notification.' });
      } else {
        toast({ title: 'No notification sent', description: data?.message || 'Telegram may not be configured correctly.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send test notification. Check your Telegram connection.', variant: 'destructive' });
    }
  };

  const isConnected = !!settings?.telegramChatId;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>
          Get Telegram notifications when bookings start or assignments end.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
                {settings?.telegramUsername && (
                  <span className="text-sm text-gray-600">@{settings.telegramUsername}</span>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="notif-toggle" className="text-sm">Enabled</Label>
                  <Switch
                    id="notif-toggle"
                    checked={settings?.enabled ?? false}
                    onCheckedChange={handleToggle}
                  />
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSendTest}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnectTelegram.isPending}>
                  <Unplug className="mr-2 h-4 w-4" />
                  {disconnectTelegram.isPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {isAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button onClick={handleConnect} disabled={connectTelegram.isPending || polling}>
                    <Send className="mr-2 h-4 w-4" />
                    {polling ? 'Waiting for connection...' : connectTelegram.isPending ? 'Generating link...' : 'Connect Telegram'}
                  </Button>
                  {polling && (
                    <span className="text-sm text-gray-500 animate-pulse">
                      Open the bot and press Start
                    </span>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setShowManual(!showManual)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showManual ? 'rotate-180' : ''}`} />
                    Manual connect (paste Chat ID)
                  </button>
                  {showManual && (
                    <div className="mt-2 flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor="chatId" className="text-xs text-gray-500">
                          Send /start to the bot, copy the Chat ID, paste here
                        </Label>
                        <Input
                          id="chatId"
                          value={manualChatId}
                          onChange={(e) => setManualChatId(e.target.value)}
                          placeholder="e.g. 123456789"
                          className="mt-1"
                        />
                      </div>
                      <Button size="sm" onClick={handleManualConnect} disabled={!manualChatId.trim() || manualConnect.isPending}>
                        {manualConnect.isPending ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Ask a space owner or admin to connect Telegram notifications.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function LogoUploadInline({ orgId, logoUrl }: { orgId: string; logoUrl: string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleUpload(file: File) {
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a JPEG, PNG, WebP, or SVG image.', variant: 'destructive' });
      return;
    }
    if (file.size > LOGO_MAX_SIZE) {
      toast({ title: 'File too large', description: 'Logo must be under 2MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${orgId}/logo.${ext}`;

      // Remove old file if exists (different extension)
      if (logoUrl) {
        const oldPath = logoUrl.split('/org-logos/')[1]?.split('?')[0];
        if (oldPath && oldPath !== path) {
          await supabaseClient.storage.from('org-logos').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabaseClient.storage
        .from('org-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('org-logos')
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ logo_url: urlWithCacheBust })
        .eq('id', orgId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Logo uploaded', description: 'Your space logo has been updated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Something went wrong.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!logoUrl) return;
    setDeleting(true);
    try {
      const pathPart = logoUrl.split('/org-logos/')[1]?.split('?')[0];
      if (pathPart) {
        await supabaseClient.storage.from('org-logos').remove([pathPart]);
      }

      const { error: updateError } = await supabaseClient
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', orgId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Logo removed' });
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to remove logo.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Label>Logo</Label>
      <p className="text-xs text-gray-500 mb-2">Shown on the public booking page.</p>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div
            className="h-10 w-10 rounded bg-gray-50 border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={logoUrl} alt="Logo" className="max-h-8 max-w-8 object-contain" />
          </div>
        ) : (
          <div
            className="h-10 w-10 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0 cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }}
          >
            <Upload className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : logoUrl ? 'Replace' : 'Upload'}
          </Button>
          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-600 hover:text-red-700"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}

function PublicBookingCard({
  orgId,
  orgSlug,
  isAdmin,
  enabled,
  maxDaysAhead,
}: {
  orgId: string;
  orgSlug: string;
  isAdmin: boolean;
  enabled: boolean;
  maxDaysAhead: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: telegramSettings } = useTelegramSettings(orgId);
  const isTelegramConnected = !!telegramSettings?.telegramChatId && telegramSettings?.enabled;
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [days, setDays] = useState(String(maxDaysAhead));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsEnabled(enabled);
    setDays(String(maxDaysAhead));
  }, [enabled, maxDaysAhead]);

  const bookingUrl = `${window.location.origin}/book/${orgSlug}`;

  const hasChanges = isEnabled !== enabled || days !== String(maxDaysAhead);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({
          public_booking_enabled: isEnabled,
          public_booking_max_days_ahead: parseInt(days) || 14,
        })
        .eq('id', orgId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Saved', description: 'Public booking settings updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <CardTitle>Public Booking Page</CardTitle>
        </div>
        <CardDescription>
          Allow visitors to request desk bookings without an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="public-booking-toggle"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=unchecked]:bg-gray-300"
              />
              <Label htmlFor="public-booking-toggle">Enable public booking</Label>
            </div>

            {isEnabled && (
              <>
                {!isTelegramConnected && (
                  <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <Bell className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">
                      Without Telegram connected, you'll only see new bookings when you open the calendar. Connect Telegram above to get instant alerts.
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-gray-500">Shareable link</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={bookingUrl} readOnly className="text-sm bg-gray-50" />
                    <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="max-days">Max days ahead</Label>
                  <Input
                    id="max-days"
                    type="number"
                    min="1"
                    max="90"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">How far in advance visitors can book.</p>
                </div>
              </>
            )}

            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Ask a space owner or admin to configure public booking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
