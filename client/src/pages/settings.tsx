import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRenameRoom, useRenameDesk, useAddRoom, useSetRoomDeskCount, useMergeRooms } from '@/hooks/use-organization';
import { useTelegramSettings, useConnectTelegram, useDisconnectTelegram, useToggleNotifications, useManualConnect, useToggleEmailNotifications } from '@/hooks/use-telegram';
import { useCreateMeetingRoom, useUpdateMeetingRoom, useDeleteMeetingRoom } from '@/hooks/use-meeting-rooms';
import { Building2, LayoutGrid, Save, Pencil, Plus, X, Bell, Send, Unplug, ChevronDown, Globe, Copy, Check, Upload, Trash2, RefreshCw, ImageIcon, DoorOpen, Mail, Phone, Package, CalendarDays, CalendarRange, Users, Shield, UserMinus, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Organization } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { useTeamMembersWithEmails, useGroupTeamMembers, useInviteManager, useRemoveManager } from '@/hooks/use-team-members';
import telegramIcon from '@/assets/telegram.svg?url';
import viberIcon from '@/assets/viber.svg?url';
import whatsappIcon from '@/assets/whatsapp.svg?url';
import { activeCurrencies, currencyLabels } from '@/lib/settings';
import { DAY_LABELS } from '@/lib/workingDays';
import { groupDesksByRoom } from '@/lib/deskGrouping';

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

function OrgSettingsCard() {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [currency, setCurrency] = useState(currentOrg?.currency || 'EUR');
  const [workingDays, setWorkingDays] = useState<number[]>(currentOrg?.workingDays || [1, 2, 3, 4, 5]);

  const toggleWorkingDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const hasOrgChanges =
    orgName !== (currentOrg?.name || '') ||
    currency !== (currentOrg?.currency || 'EUR') ||
    JSON.stringify(workingDays) !== JSON.stringify(currentOrg?.workingDays || [1, 2, 3, 4, 5]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ name: orgName, currency, working_days: workingDays })
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

  if (!currentOrg) return null;

  return (
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
  );
}

function BillingSettingsCard() {
  const { currentOrg, currentRole } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const isAdmin = currentRole === 'owner' || currentRole === 'admin';

  const [legalName, setLegalName] = useState(currentOrg?.billingLegalName ?? '');
  const [taxId, setTaxId] = useState(currentOrg?.billingTaxId ?? '');
  const [vatId, setVatId] = useState(currentOrg?.billingVatId ?? '');
  const [address, setAddress] = useState(currentOrg?.billingAddress ?? '');
  const [mol, setMol] = useState(currentOrg?.billingMol ?? '');
  const [compiledBy, setCompiledBy] = useState(currentOrg?.billingCompiledBy ?? '');
  const [bankDetails, setBankDetails] = useState(currentOrg?.billingBankDetails ?? '');
  const [vatRate, setVatRate] = useState(String(currentOrg?.defaultVatRate ?? 0));
  const [nextNumber, setNextNumber] = useState(String(currentOrg?.invoiceNumberNext ?? 1));
  const [padding, setPadding] = useState(String(currentOrg?.invoiceNumberPadding ?? 10));

  useEffect(() => {
    if (!currentOrg) return;
    setLegalName(currentOrg.billingLegalName ?? '');
    setTaxId(currentOrg.billingTaxId ?? '');
    setVatId(currentOrg.billingVatId ?? '');
    setAddress(currentOrg.billingAddress ?? '');
    setMol(currentOrg.billingMol ?? '');
    setCompiledBy(currentOrg.billingCompiledBy ?? '');
    setBankDetails(currentOrg.billingBankDetails ?? '');
    setVatRate(String(currentOrg.defaultVatRate ?? 0));
    setNextNumber(String(currentOrg.invoiceNumberNext ?? 1));
    setPadding(String(currentOrg.invoiceNumberPadding ?? 10));
  }, [currentOrg]);

  if (!currentOrg) return null;

  const parsedVat = Number(vatRate);
  const parsedNext = Number(nextNumber);
  const parsedPadding = Number(padding);

  const vatValid = Number.isFinite(parsedVat) && parsedVat >= 0 && parsedVat <= 100;
  const nextValid = Number.isInteger(parsedNext) && parsedNext >= 1;
  const paddingValid = Number.isInteger(parsedPadding) && parsedPadding >= 1 && parsedPadding <= 20;

  const hasChanges =
    legalName !== (currentOrg.billingLegalName ?? '') ||
    taxId !== (currentOrg.billingTaxId ?? '') ||
    vatId !== (currentOrg.billingVatId ?? '') ||
    address !== (currentOrg.billingAddress ?? '') ||
    mol !== (currentOrg.billingMol ?? '') ||
    compiledBy !== (currentOrg.billingCompiledBy ?? '') ||
    bankDetails !== (currentOrg.billingBankDetails ?? '') ||
    parsedVat !== (currentOrg.defaultVatRate ?? 0) ||
    parsedNext !== (currentOrg.invoiceNumberNext ?? 1) ||
    parsedPadding !== (currentOrg.invoiceNumberPadding ?? 10);

  const canSave = isAdmin && hasChanges && vatValid && nextValid && paddingValid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({
          billing_legal_name: legalName.trim() || null,
          billing_tax_id: taxId.trim() || null,
          billing_vat_id: vatId.trim() || null,
          billing_address: address.trim() || null,
          billing_mol: mol.trim() || null,
          billing_compiled_by: compiledBy.trim() || null,
          billing_bank_details: bankDetails.trim() || null,
          default_vat_rate: parsedVat,
          invoice_number_next: parsedNext,
          invoice_number_padding: parsedPadding,
        })
        .eq('id', currentOrg.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Billing details saved', description: 'Invoice settings updated.', duration: 1800 });
    } catch {
      toast({ title: 'Error', description: 'Failed to save billing details.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const previewNumber = nextValid && paddingValid
    ? String(parsedNext).padStart(parsedPadding, '0')
    : '—';

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <CardTitle>Billing</CardTitle>
        </div>
        <CardDescription>
          Seller details and invoice numbering. Shown on every invoice you generate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="billingLegalName">Legal name</Label>
              <Input
                id="billingLegalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Acme Coworking Ltd."
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label htmlFor="billingTaxId">Tax / company ID</Label>
              <Input
                id="billingTaxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="123456789"
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label htmlFor="billingVatId">VAT ID <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="billingVatId"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                placeholder="VAT0000000"
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="billingAddress">Address</Label>
            <Textarea
              id="billingAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={'123 Main Street\nCity, Country'}
              rows={3}
              disabled={!isAdmin}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="billingMol">Signed by</Label>
              <Input
                id="billingMol"
                value={mol}
                onChange={(e) => setMol(e.target.value)}
                placeholder="Full name"
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-500 mt-1">Name of the person who signs invoices on behalf of the company.</p>
            </div>
            <div>
              <Label htmlFor="billingCompiledBy">Compiled by <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="billingCompiledBy"
                value={compiledBy}
                onChange={(e) => setCompiledBy(e.target.value)}
                placeholder="Accountant's name"
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-500 mt-1">Default; editable per invoice.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="billingBankDetails">Bank details <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              id="billingBankDetails"
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder={'Bank Name\nBIC: ABCDEFGH\nIBAN: XX00 0000 0000 0000 0000 00'}
              rows={3}
              disabled={!isAdmin}
            />
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700 mb-3">Invoice numbering & VAT</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="defaultVatRate">Default VAT rate %</Label>
                <Input
                  id="defaultVatRate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  disabled={!isAdmin}
                />
                {!vatValid && <p className="text-xs text-red-600 mt-1">Must be 0–100.</p>}
              </div>
              <div>
                <Label htmlFor="invoiceNumberNext">Next invoice #</Label>
                <Input
                  id="invoiceNumberNext"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={nextNumber}
                  onChange={(e) => setNextNumber(e.target.value)}
                  disabled={!isAdmin}
                />
                {!nextValid && <p className="text-xs text-red-600 mt-1">Must be ≥ 1.</p>}
              </div>
              <div>
                <Label htmlFor="invoiceNumberPadding">Zero-padding</Label>
                <Input
                  id="invoiceNumberPadding"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  step={1}
                  value={padding}
                  onChange={(e) => setPadding(e.target.value)}
                  disabled={!isAdmin}
                />
                {!paddingValid && <p className="text-xs text-red-600 mt-1">1–20 digits.</p>}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Next invoice will be issued as <span className="font-mono text-gray-700">{previewNumber}</span>.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || !canSave}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoomsSettingsCard() {
  const { currentOrg, rooms, desks } = useOrganization();
  const { toast } = useToast();
  const renameRoom = useRenameRoom();
  const renameDesk = useRenameDesk();
  const addRoom = useAddRoom();
  const setRoomDeskCount = useSetRoomDeskCount();
  const mergeRooms = useMergeRooms();

  // Precompute desks-per-room in O(n) instead of filtering inside rooms.map() which was O(rooms × desks).
  const desksByRoom = useMemo(() => groupDesksByRoom(desks), [desks]);

  const [addingRoom, setAddingRoom] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeKeepId, setMergeKeepId] = useState<string>('');
  const [mergingRooms, setMergingRooms] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesks, setNewRoomDesks] = useState(4);
  const newRoomInputRef = useRef<HTMLInputElement>(null);

  // Draft state for Rooms & Desks (buffered until Save)
  const [draftRoomNames, setDraftRoomNames] = useState<Record<string, string>>({});
  const [draftDeskLabels, setDraftDeskLabels] = useState<Record<string, string>>({});
  const [draftDeskCounts, setDraftDeskCounts] = useState<Record<string, number>>({});
  const [pendingNewRooms, setPendingNewRooms] = useState<Array<{ name: string; deskCount: number }>>([]);
  const [savingRooms, setSavingRooms] = useState(false);

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
    const roomDesks = desksByRoom.get(roomId) ?? [];
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

  const handleMergeRooms = async () => {
    if (!currentOrg || !mergeKeepId || rooms.length !== 2) return;
    const removeRoom = rooms.find((r) => r.id !== mergeKeepId);
    if (!removeRoom) return;
    setMergingRooms(true);
    mergeRooms.mutate(
      { keepRoomId: mergeKeepId, removeRoomId: removeRoom.id, orgId: currentOrg.id },
      {
        onSuccess: () => {
          toast({ title: 'Rooms merged', description: `"${removeRoom.name}" was merged into the selected room.` });
          setMergeDialogOpen(false);
          setMergeKeepId('');
          setMergingRooms(false);
        },
        onError: () => {
          toast({ title: 'Merge failed', description: 'Could not merge rooms. Try again.', variant: 'destructive' });
          setMergingRooms(false);
        },
      }
    );
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
        const roomDesks = desksByRoom.get(roomId) ?? [];
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
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          <CardTitle>Rooms & Desks</CardTitle>
        </div>
        <CardDescription>Click any name to rename it. Change desk counts by editing the number.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-3 flex-1">
          {rooms.map((room) => {
            const roomDesks = desksByRoom.get(room.id) ?? [];
            const displayDeskCount = draftDeskCounts[room.id] ?? roomDesks.length;
            return (
              <div key={room.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <InlineEdit
                    value={draftRoomNames[room.id] ?? room.name}
                    onSave={(newName) => handleDraftRoomRename(room.id, newName)}
                    className="font-medium text-gray-900"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={displayDeskCount}
                    onChange={(e) => handleDraftDeskCountChange(room.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 h-8 text-sm"
                  />
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
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500 mb-1">Room name</Label>
                  <Input
                    ref={newRoomInputRef}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Open Space"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoomName.trim()) handleAddRoom();
                      if (e.key === 'Escape') { setAddingRoom(false); setNewRoomName(''); }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1">Desks</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoomDesks}
                    onChange={(e) => setNewRoomDesks(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 h-9 text-sm"
                  />
                </div>
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

          {rooms.length === 2 && !addingRoom && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => { setMergeKeepId(rooms[0].id); setMergeDialogOpen(true); }}
            >
              Merge Rooms into One
            </Button>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button onClick={handleSaveRooms} disabled={!hasRoomChanges || savingRooms}>
            <Save className="mr-2 h-4 w-4" />
            {savingRooms ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Rooms</AlertDialogTitle>
            <AlertDialogDescription>
              All desks from the removed room will move into the kept room. The removed room and its floor plan layout will be permanently deleted. Existing bookings are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm font-medium text-gray-700">Keep this room:</p>
            <div className="flex gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setMergeKeepId(r.id)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    mergeKeepId === r.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r.name}
                  <span className="block text-xs font-normal opacity-60 mt-0.5">
                    {(desksByRoom.get(r.id) ?? []).length} desks
                  </span>
                </button>
              ))}
            </div>
            {mergeKeepId && (
              <p className="text-xs text-gray-500 pt-1">
                "{rooms.find((r) => r.id !== mergeKeepId)?.name}" will be deleted.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergingRooms}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleMergeRooms(); }}
              disabled={!mergeKeepId || mergingRooms}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {mergingRooms ? 'Merging…' : 'Merge Rooms'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function SettingsPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg) return null;
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Organization</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <OrgSettingsCard />
        <SpaceContactCard orgId={currentOrg.id} org={currentOrg} isAdmin={isAdmin} />
        <BillingSettingsCard />
      </div>
    </div>
  );
}

export function SettingsTeamPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg || currentRole !== 'owner') return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TeamCard orgId={currentOrg.id} groupId={currentOrg.groupId ?? undefined} />
      </div>
    </div>
  );
}

export function SettingsNotificationsPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg) return null;
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TelegramNotificationsCard orgId={currentOrg.id} isAdmin={isAdmin} />
        <EmailNotificationsCard orgId={currentOrg.id} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function TeamCard({ orgId, groupId }: { orgId: string; groupId?: string }) {
  const { toast } = useToast();
  const isGroup = !!groupId;

  // Use group-level query when in a group, otherwise per-org query
  const { data: groupMembers = [], isLoading: groupLoading } = useGroupTeamMembers(groupId);
  const { data: orgMembers = [], isLoading: orgLoading } = useTeamMembersWithEmails(isGroup ? undefined : orgId);

  const members = isGroup ? groupMembers : orgMembers;
  const isLoading = isGroup ? groupLoading : orgLoading;

  const inviteManager = useInviteManager();
  const removeManager = useRemoveManager();
  const [email, setEmail] = useState('');
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    try {
      const result = await inviteManager.mutateAsync({ organizationId: orgId, email: trimmed, groupId });
      setEmail('');
      const locationNote = result?.locationCount > 1 ? ` across ${result.locationCount} locations` : '';
      if (result?.emailSent === false) {
        toast({ title: 'Manager added', description: `Account created${locationNote} but email failed to send. Share the credentials manually.` });
      } else {
        toast({ title: 'Invite sent!', description: `Login credentials sent to ${trimmed}${locationNote}.` });
      }
    } catch (err) {
      toast({ title: 'Failed to invite', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleRemove = async (userId: string, orgIds?: string[]) => {
    try {
      await removeManager.mutateAsync({ userId, organizationId: orgId, groupId, orgIds });
      setConfirmRemoveUserId(null);
      toast({ title: 'Team member removed' });
    } catch (err) {
      toast({ title: 'Failed to remove member', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const maxReached = !isGroup && members.length >= 3;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <CardTitle>Team</CardTitle>
        </div>
        <CardDescription>
          {isGroup
            ? 'Managers have access to all locations in your group.'
            : 'Invite managers to help run your space. Max 3 team members.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team...
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const gm = isGroup ? (m as import('@/hooks/use-team-members').GroupTeamMember) : null;
              const userId = m.userId;
              const allLocations = gm && gm.orgNames.length > 1;
              return (
                <div key={userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.email}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Shield className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 capitalize">{m.role === 'admin' ? 'Manager' : m.role}</span>
                        {gm && allLocations && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                            All locations
                          </span>
                        )}
                        {gm && !allLocations && gm.orgNames.map((name) => (
                          <span key={name} className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {m.role !== 'owner' && (
                    confirmRemoveUserId === userId ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemove(userId, gm?.orgIds)}
                          disabled={removeManager.isPending}
                        >
                          {removeManager.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveUserId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveUserId(userId)}>
                        <UserMinus className="h-4 w-4 text-gray-400" />
                      </Button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!maxReached && (
          <div className="pt-2 border-t">
            <Label htmlFor="invite-email" className="text-sm">Invite a manager</Label>
            <p className="text-xs text-gray-500 mb-2">
              {isGroup
                ? "We'll create an account and give them access to all locations."
                : "We'll create an account and send them login credentials."}
            </p>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                placeholder="manager@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                disabled={inviteManager.isPending}
              />
              <Button onClick={handleInvite} disabled={inviteManager.isPending || !email.trim()}>
                {inviteManager.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {maxReached && (
          <p className="text-xs text-amber-600 pt-2 border-t">Maximum team size reached (3 members).</p>
        )}
      </CardContent>
    </Card>
  );
}

function MeetingRoomsCard({ orgId, currency, isAdmin }: { orgId: string; currency: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const { meetingRooms } = useOrganization();
  const createMR = useCreateMeetingRoom();
  const updateMR = useUpdateMeetingRoom();
  const deleteMR = useDeleteMeetingRoom();

  const [addingRoom, setAddingRoom] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('15');
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingRoom) newNameRef.current?.focus();
  }, [addingRoom]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createMR.mutateAsync({
        orgId,
        name: newName.trim(),
        capacity: 4,
        hourlyRate: parseFloat(newRate) || 0,
        currency,
        amenities: [],
        sortOrder: meetingRooms.length,
      });
      setNewName('');
      setNewRate('15');
      setAddingRoom(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to add meeting room.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMR.mutateAsync({ id, orgId });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove meeting room.', variant: 'destructive' });
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-blue-600" />
          <CardTitle>Meeting Rooms</CardTitle>
        </div>
        <CardDescription>Rooms available for hourly booking.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          {meetingRooms.length === 0 && !addingRoom && (
            <p className="text-sm text-gray-500">No meeting rooms configured.</p>
          )}
          {meetingRooms.map((mr) => (
            <div key={mr.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <InlineEdit
                value={mr.name}
                onSave={(name) => updateMR.mutate({ id: mr.id, orgId, name })}
                className="flex-1 text-sm font-medium text-gray-900"
              />
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue={mr.hourlyRate}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== mr.hourlyRate) {
                      updateMR.mutate({ id: mr.id, orgId, hourlyRate: val });
                    }
                  }}
                  className="w-20 h-7 text-xs"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">{currency}/hr</span>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                  onClick={() => handleDelete(mr.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {addingRoom && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 space-y-2">
              <div className="flex gap-2">
                <Input
                  ref={newNameRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Room name"
                  className="flex-1 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newName.trim()) handleAdd();
                    if (e.key === 'Escape') { setAddingRoom(false); setNewName(''); }
                  }}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-xs text-gray-500 self-center whitespace-nowrap">{currency}/hr</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createMR.isPending}>
                  {createMR.isPending ? 'Adding...' : 'Add'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingRoom(false); setNewName(''); }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {!addingRoom && isAdmin && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingRoom(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Meeting Room
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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

function EmailNotificationsCard({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useTelegramSettings(orgId);
  const toggleEmail = useToggleEmailNotifications();

  const handleToggle = async (field: 'email_enabled' | 'email_daily_digest' | 'email_booking_alerts' | 'email_lifecycle', value: boolean) => {
    try {
      await toggleEmail.mutateAsync({ orgId, field, value });
    } catch {
      toast({ title: 'Error', description: 'Failed to update email settings.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Notifications</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-gray-500">Loading...</p></CardContent>
      </Card>
    );
  }

  const emailEnabled = settings?.emailEnabled ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          {isAdmin && (
            <Switch
              checked={emailEnabled}
              onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
            />
          )}
        </div>
        <CardDescription>
          Get email notifications for bookings and activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin ? (
          <p className="text-sm text-gray-500">Ask a space owner or admin to configure email notifications.</p>
        ) : emailEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Daily digest</p>
                <p className="text-xs text-gray-500">Summary of bookings starting and assignments ending tomorrow</p>
              </div>
              <Switch
                checked={settings?.emailDailyDigest ?? true}
                onCheckedChange={(checked) => handleToggle('email_daily_digest', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Booking alerts</p>
                <p className="text-xs text-gray-500">Instant email when someone submits a public booking</p>
              </div>
              <Switch
                checked={settings?.emailBookingAlerts ?? true}
                onCheckedChange={(checked) => handleToggle('email_booking_alerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lifecycle emails</p>
                <p className="text-xs text-gray-500">Occasional check-ins if you haven't used OhMyDesk in a while</p>
              </div>
              <Switch
                checked={settings?.emailLifecycle ?? true}
                onCheckedChange={(checked) => handleToggle('email_lifecycle', checked)}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Enable to receive email notifications for your space.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SpaceContactCard({ orgId, org, isAdmin }: { orgId: string; org: Organization; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(org.contactPhone || '');
  const [email, setEmail] = useState(org.contactEmail || '');
  const [telegram, setTelegram] = useState(org.contactTelegram || '');
  const [viberEnabled, setViberEnabled] = useState(org.contactViberEnabled ?? false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(org.contactWhatsappEnabled ?? false);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    phone !== (org.contactPhone || '') ||
    email !== (org.contactEmail || '') ||
    telegram !== (org.contactTelegram || '') ||
    viberEnabled !== (org.contactViberEnabled ?? false) ||
    whatsappEnabled !== (org.contactWhatsappEnabled ?? false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          contact_telegram: telegram.trim().replace(/^@/, '') || null,
          contact_viber_enabled: viberEnabled,
          contact_whatsapp_enabled: whatsappEnabled,
        })
        .eq('id', orgId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Saved', description: 'Contact info updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save contact info.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contact Info
        </CardTitle>
        <CardDescription>
          Shown on your public booking page and shared booking links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin ? (
          <p className="text-sm text-gray-500">Ask a space owner or admin to manage contact info.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input type="tel" placeholder="+359 888 123 456" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="hello@yourspace.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telegram</Label>
              <Input placeholder="username (without @)" value={telegram} onChange={e => setTelegram(e.target.value)} />
            </div>
            {phone.trim() && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-gray-500">Also reachable via:</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={whatsappEnabled} onCheckedChange={(v) => setWhatsappEnabled(v === true)} />
                  <img src={whatsappIcon} alt="" className="h-5 w-5" />
                  <span className="text-sm">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={viberEnabled} onCheckedChange={(v) => setViberEnabled(v === true)} />
                  <img src={viberIcon} alt="" className="h-5 w-5" />
                  <span className="text-sm">Viber</span>
                </label>
              </div>
            )}
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Contact Info'}
              </Button>
            )}
          </div>
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

function FlexPlanCard({
  orgId,
  currency,
  flexPlanDays,
  flexPlanPrice,
  isAdmin,
}: {
  orgId: string;
  currency: string;
  flexPlanDays: number | null;
  flexPlanPrice: number | null;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(flexPlanDays?.toString() || '');
  const [price, setPrice] = useState(flexPlanPrice?.toString() || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDays(flexPlanDays?.toString() || '');
    setPrice(flexPlanPrice?.toString() || '');
  }, [flexPlanDays, flexPlanPrice]);

  const parsedDays = parseInt(days) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const perVisitPrice = parsedDays > 0 ? (parsedPrice / parsedDays) : 0;
  const isConfigured = flexPlanDays && flexPlanDays > 0 && flexPlanPrice && flexPlanPrice > 0;

  const hasChanges =
    days !== (flexPlanDays?.toString() || '') ||
    price !== (flexPlanPrice?.toString() || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({
          flex_plan_days: parsedDays || null,
          flex_plan_price: parsedPrice || null,
        })
        .eq('id', orgId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Saved', description: 'Flex plan updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save flex plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ flex_plan_days: null, flex_plan_price: null })
        .eq('id', orgId);

      if (error) throw error;
      setDays('');
      setPrice('');
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Cleared', description: 'Flex plan disabled.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to clear flex plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            Flex Plan
          </CardTitle>
          {isConfigured && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Active
            </span>
          )}
        </div>
        <CardDescription>
          Offer day packages to members (e.g. 10 days for {currency} 80). Each visit deducts one day from their balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {!isAdmin ? (
          <p className="text-sm text-gray-500">Ask a space owner or admin to configure the flex plan.</p>
        ) : (
          <>
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flexDays">Days per plan</Label>
                  <Input
                    id="flexDays"
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="flexPrice">Plan price ({currency})</Label>
                  <Input
                    id="flexPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 80"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              {parsedDays > 0 && parsedPrice > 0 && (
                <p className="text-sm text-gray-600">
                  Per visit: <span className="font-medium">{currency} {perVisitPrice.toFixed(2)}</span>
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button onClick={handleSave} disabled={saving || !hasChanges || parsedDays <= 0 || parsedPrice <= 0}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {isConfigured && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={saving} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Disable
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable flex plan?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <span className="block">This will remove the flex plan configuration. New plans can no longer be sold.</span>
                        <span className="block font-medium text-gray-700">Existing member balances are not affected — members keep their remaining days and can still check in as usual.</span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClear}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Disable flex plan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
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

export function SettingsRoomsPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg) return null;
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <RoomsSettingsCard />
        <MeetingRoomsCard orgId={currentOrg.id} currency={currentOrg.currency} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function ComingSoonCard({ name, description, svgPath }: { name: string; description: string; svgPath: string }) {
  return (
    <Card className="flex flex-col opacity-50 select-none pointer-events-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-gray-500">
                <path d={svgPath} />
              </svg>
            </div>
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
            Coming soon
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

const STRIPE_SVG_PATH = 'M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z';

function StripeIntegrationCard({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [togglingPayments, setTogglingPayments] = useState(false);

  const isConnected = !!org.stripePublishableKey;
  const showForm = !isConnected || editing;

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;

  const handleConnect = async () => {
    if (!secretKey.trim() || !publishableKey.trim()) {
      toast({ title: 'Missing keys', description: 'Please enter both Stripe keys.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabaseClient.functions.invoke('stripe-config', {
        body: { orgId: org.id, secretKey: secretKey.trim(), publishableKey: publishableKey.trim() },
      });

      // Supabase's functions.invoke sets `error` (not `data`) on non-2xx responses.
      // Read the actual response body from error.context.
      let errorBody: { error?: string; message?: string } | null = null;
      if (error && 'context' in error && error.context instanceof Response) {
        try {
          errorBody = await error.context.clone().json();
        } catch {
          // ignore parse failure
        }
      }

      if (error || data?.error) {
        const code = errorBody?.error ?? data?.error;
        const message = errorBody?.message ?? data?.message;
        console.error('stripe-config error:', { code, message, error });
        const msg = code === 'invalid_key'
          ? (message || 'Invalid Stripe key. Please check and try again.')
          : (message || `Failed to save Stripe configuration${code ? ` (${code})` : ''}.`);
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Stripe connected', description: 'Your Stripe account is now linked.' });
      setSecretKey('');
      setPublishableKey('');
      setEditing(false);
    } catch (err) {
      console.error('stripe-config exception:', err);
      toast({ title: 'Error', description: 'Failed to save Stripe configuration.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await supabaseClient.functions.invoke('stripe-config', {
        body: { orgId: org.id, action: 'disconnect' },
      });
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Disconnected', description: 'Stripe has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect Stripe.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePayments = async (enabled: boolean) => {
    setTogglingPayments(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ stripe_public_booking_payments: enabled })
        .eq('id', org.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({
        title: enabled ? 'Payments enabled' : 'Payments disabled',
        description: enabled
          ? 'Visitors will now pay before their booking is confirmed.'
          : 'Public bookings will be free again.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to update setting.', variant: 'destructive' });
    } finally {
      setTogglingPayments(false);
    }
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col" data-testid="stripe-integration-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-indigo-600">
                <path d={STRIPE_SVG_PATH} />
              </svg>
            </div>
            <CardTitle className="text-base">Stripe</CardTitle>
          </div>
          {isConnected && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-green-600 border border-green-200 bg-green-50 rounded-full px-2 py-0.5">
              Connected
            </span>
          )}
        </div>
        <CardDescription>
          Collect desk booking payments online from visitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 space-y-4">
        {!isAdmin ? (
          <p className="text-sm text-gray-500">
            Ask a space owner or admin to configure Stripe.
          </p>
        ) : (
          <>
            {/* Connection section */}
            {showForm ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="stripe-secret-key" className="text-sm">Secret Key</Label>
                  <Input
                    id="stripe-secret-key"
                    type="password"
                    placeholder="sk_live_... or sk_test_..."
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="stripe-publishable-key" className="text-sm">Publishable Key</Label>
                  <Input
                    id="stripe-publishable-key"
                    type="password"
                    placeholder="pk_live_... or pk_test_..."
                    value={publishableKey}
                    onChange={(e) => setPublishableKey(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConnect} disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : 'Connect'}
                  </Button>
                  {editing && (
                    <Button variant="outline" onClick={() => { setEditing(false); setSecretKey(''); setPublishableKey(''); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-500">
                  Key: <span className="font-mono text-xs">{org.stripePublishableKey?.slice(0, 7)}...{org.stripePublishableKey?.slice(-4)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit keys
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" disabled={saving}>
                        <Unplug className="mr-2 h-3 w-3" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Stripe?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your Stripe keys and disable payment collection on the public booking page.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700 text-white">
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Webhook setup instructions (visible when connected) */}
            {isConnected && !editing && (
              <>
                <div className="border-t pt-4 space-y-2">
                  <Label className="text-sm text-gray-500">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="text-xs bg-gray-50 font-mono" />
                    <Button variant="outline" size="sm" onClick={handleCopyWebhook} className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Add this in Stripe Dashboard &rarr; Developers &rarr; Webhooks. Select event: <span className="font-mono">checkout.session.completed</span>
                  </p>
                </div>

                {/* Features section */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="stripe-public-payments"
                      checked={org.stripePublicBookingPayments}
                      onCheckedChange={handleTogglePayments}
                      disabled={togglingPayments}
                      className="data-[state=unchecked]:bg-gray-300"
                    />
                    <div>
                      <Label htmlFor="stripe-public-payments" className="text-sm font-medium">Charge visitors on public booking page</Label>
                      <p className="text-xs text-gray-500">Visitors will pay your day pass rate before their booking is confirmed.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const COMING_SOON_INTEGRATIONS = [
  {
    name: 'Slack',
    description: 'Get booking notifications and daily summaries delivered straight to your Slack channel.',
    svgPath: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z',
  },
  {
    name: 'Google Calendar',
    description: "Sync all desk bookings to Google Calendar so your team always knows who's in.",
    svgPath: 'M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM0 5.684v12.632h5.684V5.684H0zM5.684 0v5.684h12.632V0H5.684zM18.316 0v5.684H24V0h-5.684zM0 0v5.684h5.684V0H0zM0 18.316V24h5.684v-5.684H0zM18.316 18.316V24H24v-5.684h-5.684z',
  },
];

export function SettingsIntegrationsPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg) return null;
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <PublicBookingCard
          orgId={currentOrg.id}
          orgSlug={currentOrg.slug}
          isAdmin={isAdmin}
          enabled={currentOrg.publicBookingEnabled}
          maxDaysAhead={currentOrg.publicBookingMaxDaysAhead}
        />
        <StripeIntegrationCard org={currentOrg} isAdmin={isAdmin} />
        {COMING_SOON_INTEGRATIONS.map((item) => (
          <ComingSoonCard key={item.name} {...item} />
        ))}
      </div>
    </div>
  );
}

function DayPassPlanCard() {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(currentOrg?.defaultPricePerDay?.toString() || '8');
  const [saving, setSaving] = useState(false);

  const hasChanges = price !== (currentOrg?.defaultPricePerDay?.toString() || '8');

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ default_price_per_day: parseFloat(price) || 0 })
        .eq('id', currentOrg.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({ title: 'Saved', description: 'Day pass price updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!currentOrg) return null;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <CardTitle>Day Pass</CardTitle>
        </div>
        <CardDescription>Default price charged per desk per day for walk-in and public bookings.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-4 flex-1">
          <div>
            <Label htmlFor="dayPassPrice">Price per desk / day ({currentOrg.currency})</Label>
            <Input
              id="dayPassPrice"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DedicatedPlanCardProps {
  orgId: string;
  currency: string;
  planKey: 'weekly' | 'monthly';
  currentPrice: number | null;
  workingDaysPerWeek: number;
}

function DedicatedPlanCard({ orgId, currency, planKey, currentPrice, workingDaysPerWeek }: DedicatedPlanCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(currentPrice?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const hasChanges = (price || '0') !== (currentPrice?.toString() ?? '');

  const labels = planKey === 'weekly'
    ? {
        title: 'Weekly Plan',
        description: 'Fixed price for 7 calendar days at a dedicated desk.',
        priceLabel: `Price per week (${currency})`,
        icon: <CalendarDays className="h-5 w-5 text-sky-600" />,
      }
    : {
        title: 'Monthly Plan',
        description: 'Fixed price for one calendar month at a dedicated desk.',
        priceLabel: `Price per month (${currency})`,
        icon: <CalendarRange className="h-5 w-5 text-indigo-600" />,
      };

  const column = planKey === 'weekly' ? 'weekly_plan_price' : 'monthly_plan_price';

  const writePrice = async (value: number | null) => {
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ [column]: value })
        .eq('id', orgId);
      if (error) throw error;
      if (value === null) setPrice('');
      queryClient.invalidateQueries({ queryKey: ['user-organizations'] });
      toast({
        title: value === null ? 'Disabled' : 'Saved',
        description: value === null
          ? `${labels.title} is no longer offered.`
          : `${labels.title} updated.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const parsed = parseFloat(price);
    const value = isNaN(parsed) || parsed <= 0 ? null : parsed;
    return writePrice(value);
  };
  const handleClear = () => writePrice(null);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          {labels.icon}
          <CardTitle>{labels.title}</CardTitle>
        </div>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <div className="space-y-4 flex-1">
          <div>
            <Label htmlFor={`${planKey}Price`}>{labels.priceLabel}</Label>
            <Input
              id={`${planKey}Price`}
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty to disable"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {(() => {
              const parsed = parseFloat(price);
              if (!price || isNaN(parsed) || parsed <= 0) {
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    {planKey === 'weekly'
                      ? 'Booking modal will offer a Weekly plan button when this is set.'
                      : 'Booking modal will offer a Monthly plan button when this is set.'}
                  </p>
                );
              }
              const calendarDays = planKey === 'weekly' ? 7 : 30;
              const workingDays = planKey === 'weekly'
                ? workingDaysPerWeek
                : Math.round((workingDaysPerWeek / 7) * 30);
              const perCalendarDay = parsed / calendarDays;
              const perWorkingDay = workingDays > 0 ? parsed / workingDays : 0;
              const sym = currencySymbols[currency] ?? currency;
              return (
                <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                  <p>{sym}{perWorkingDay.toFixed(2)} / working day ({workingDays} days)</p>
                  <p>{sym}{perCalendarDay.toFixed(2)} / calendar day ({calendarDays} days)</p>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {currentPrice != null && (
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
              Disable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPlansPage() {
  const { currentOrg, currentRole } = useOrganization();
  if (!currentOrg) return null;
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Plans</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <DayPassPlanCard />
        <DedicatedPlanCard
          orgId={currentOrg.id}
          currency={currentOrg.currency}
          planKey="weekly"
          currentPrice={currentOrg.weeklyPlanPrice ?? null}
          workingDaysPerWeek={(currentOrg.workingDays ?? [1,2,3,4,5]).length}
        />
        <DedicatedPlanCard
          orgId={currentOrg.id}
          currency={currentOrg.currency}
          planKey="monthly"
          currentPrice={currentOrg.monthlyPlanPrice ?? null}
          workingDaysPerWeek={(currentOrg.workingDays ?? [1,2,3,4,5]).length}
        />
        <FlexPlanCard
          orgId={currentOrg.id}
          currency={currentOrg.currency}
          flexPlanDays={currentOrg.flexPlanDays ?? null}
          flexPlanPrice={currentOrg.flexPlanPrice ?? null}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
