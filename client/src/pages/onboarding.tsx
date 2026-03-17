import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateOrganization, useCheckSlugAvailable } from '@/hooks/use-organization';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectTelegram, useTelegramSettings } from '@/hooks/use-telegram';
import { currencyLabels, currencySymbols, activeCurrencies } from '@/lib/settings';
import { Currency } from '@shared/schema';
import { DAY_LABELS, DEFAULT_WORKING_DAYS } from '@/lib/workingDays';
import { Loader2, Building2, LayoutGrid, Coins, ArrowRight, ArrowLeft, Check, Pencil, Bell, Send } from 'lucide-react';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

const STEPS = ['Space Info', 'Rooms & Desks', 'Pricing', 'Notifications'] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const createOrg = useCreateOrganization();
  const checkSlug = useCheckSlugAvailable();
  const { hasOrganization, currentOrg } = useOrganization();
  const { signOut } = useAuth();

  // Persist step & createdOrgId in sessionStorage to survive re-mounts from query invalidation
  const [step, _setStep] = useState(() => {
    const saved = sessionStorage.getItem('onboarding-step');
    return saved ? parseInt(saved, 10) : 0;
  });
  const setStep = (s: number) => {
    sessionStorage.setItem('onboarding-step', String(s));
    _setStep(s);
  };
  const [createdOrgId, _setCreatedOrgId] = useState<string | null>(() => sessionStorage.getItem('onboarding-org-id'));
  const setCreatedOrgId = (id: string | null) => {
    if (id) sessionStorage.setItem('onboarding-org-id', id);
    else sessionStorage.removeItem('onboarding-org-id');
    _setCreatedOrgId(id);
  };
  const [name, setName] = useState('');
  const [slug, _setSlug] = useState(() => sessionStorage.getItem('onboarding-slug') || '');
  const setSlug = (s: string) => {
    sessionStorage.setItem('onboarding-slug', s);
    _setSlug(s);
  };
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugEditMode, setSlugEditMode] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [roomsCount, setRoomsCount] = useState(2);
  const [desksPerRoom, setDesksPerRoom] = useState<number[]>([4, 4]);
  const [roomNames, setRoomNames] = useState<string[]>(['Room 1', 'Room 2']);
  const [workingDays, setWorkingDays] = useState<number[]>([...DEFAULT_WORKING_DAYS]);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [customCurrency, setCustomCurrency] = useState('');
  const [defaultPricePerDay, setDefaultPricePerDay] = useState('8');

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }
    const timer = setTimeout(() => {
      checkSlug.mutate(slug, {
        onSuccess: (available) => setSlugAvailable(available),
        onError: () => setSlugAvailable(null),
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  // Update room names and desksPerRoom when count changes
  useEffect(() => {
    setRoomNames(prev => {
      const newNames = [...prev];
      while (newNames.length < roomsCount) {
        newNames.push(`Room ${newNames.length + 1}`);
      }
      return newNames.slice(0, roomsCount);
    });
    setDesksPerRoom(prev => {
      const newDesks = [...prev];
      while (newDesks.length < roomsCount) {
        newDesks.push(4);
      }
      return newDesks.slice(0, roomsCount);
    });
  }, [roomsCount]);

  const toggleWorkingDay = (day: number) => {
    setWorkingDays(prev => {
      if (prev.includes(day)) {
        // Don't allow removing all days
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleSubmit = async () => {
    try {
      const org = await createOrg.mutateAsync({
        name,
        slug,
        roomsCount,
        desksPerRoom,
        currency,
        defaultPricePerDay: parseFloat(defaultPricePerDay) || 8,
        roomNames,
        workingDays,
      });
      setCreatedOrgId(org.id);
      setStep(3);
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const finishOnboarding = () => {
    sessionStorage.removeItem('onboarding-step');
    sessionStorage.removeItem('onboarding-org-id');
    sessionStorage.removeItem('onboarding-slug');
    navigate(`/${slug}/calendar`, { replace: true });
  };

  const canProceedStep0 = name.trim().length > 0 && slug.length > 0 && slugAvailable === true;
  const canProceedStep1 = roomsCount > 0 && desksPerRoom.every(d => d > 0) && roomNames.every(n => n.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === step ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {/* Step 0: Space Info */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <CardTitle>Name your coworking space</CardTitle>
              </div>
              <CardDescription>This will be visible to your team members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Space Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Downtown Hub"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="slug">Your space URL</Label>
                {slugEditMode ? (
                  <Input
                    id="slug"
                    value={slug}
                    onChange={e => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="downtown-hub"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-50 border rounded-md px-3 py-2 text-sm">
                      <span className="text-gray-400">ohmydesk.app/</span>
                      <span className="text-gray-900 font-medium">{slug || 'your-space'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSlugEditMode(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                )}
                {slug && slugAvailable === true && (
                  <p className="text-sm text-green-600 mt-1">This URL is available</p>
                )}
                {slug && slugAvailable === false && (
                  <p className="text-sm text-red-600 mt-1">This URL is already taken</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(1)}
                disabled={!canProceedStep0}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {hasOrganization && currentOrg ? (
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link to={`/${currentOrg.slug}/calendar`}>Back to workspace</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                >
                  Already have an account? Sign in
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Rooms & Desks */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="h-5 w-5 text-blue-600" />
                <CardTitle>Set up rooms & desks</CardTitle>
              </div>
              <CardDescription>Configure how many rooms and desks you have.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Number of Rooms</Label>
                <Select value={String(roomsCount)} onValueChange={v => setRoomsCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rooms & Desks</Label>
                {roomNames.map((rn, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        className="pr-8"
                        value={rn}
                        onChange={e => {
                          const updated = [...roomNames];
                          updated[i] = e.target.value;
                          setRoomNames(updated);
                        }}
                        placeholder={`Room ${i + 1}`}
                      />
                      <Pencil className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={desksPerRoom[i] ?? 4}
                      onChange={e => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        const updated = [...desksPerRoom];
                        updated[i] = val;
                        setDesksPerRoom(updated);
                      }}
                      className="w-24"
                    />
                  </div>
                ))}
              </div>

              {/* Working Days */}
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

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  Preview: {roomsCount} room{roomsCount > 1 ? 's' : ''}, {desksPerRoom.reduce((a, b) => a + b, 0)} total desks
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Currency */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-5 w-5 text-blue-600" />
                <CardTitle>Choose your currency</CardTitle>
              </div>
              <CardDescription>This will be used for all pricing and revenue tracking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {activeCurrencies.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrency(c); setCustomCurrency(''); }}
                    className={`flex-1 p-4 rounded-lg border-2 text-left transition-colors ${
                      currency === c && !customCurrency
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{currencySymbols[c]}</div>
                    <div className="font-medium text-sm">{c}</div>
                    <div className="text-xs text-gray-500">{currencyLabels[c]}</div>
                  </button>
                ))}
              </div>

              <div>
                <Label htmlFor="customCurrency" className="text-sm">Or enter ISO currency code</Label>
                <Input
                  id="customCurrency"
                  value={customCurrency}
                  onChange={e => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
                    setCustomCurrency(val);
                    if (val.length === 3) {
                      setCurrency(val as Currency);
                    }
                  }}
                  onFocus={() => {
                    if (!customCurrency && !activeCurrencies.includes(currency)) {
                      setCustomCurrency(currency);
                    }
                  }}
                  placeholder="e.g. GBP, JPY, CHF"
                  maxLength={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="defaultPrice">Default price per desk/day ({currencySymbols[currency]})</Label>
                <Input
                  id="defaultPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultPricePerDay}
                  onChange={(e) => setDefaultPricePerDay(e.target.value)}
                  className="mt-1"
                  placeholder="8"
                />
                <p className="text-xs text-gray-500 mt-1">You can change this later in settings.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={createOrg.isPending}
                >
                  {createOrg.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Space <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {createOrg.isError && (
                <p className="text-sm text-red-600 mt-2">
                  Failed to create organization. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Telegram Notifications (optional) */}
        {step === 3 && createdOrgId && (
          <TelegramOnboardingStep
            orgId={createdOrgId}
            onSkip={finishOnboarding}
          />
        )}
      </div>
    </div>
  );
}

function TelegramOnboardingStep({ orgId, onSkip }: { orgId: string; onSkip: () => void }) {
  const connectTelegram = useConnectTelegram();
  const { data: settings } = useTelegramSettings(orgId);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const isConnected = !!settings?.telegramChatId;

  // Stop polling when connected
  useEffect(() => {
    if (isConnected && polling) {
      setPolling(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [isConnected, polling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    setPolling(true);
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
      const win = window.open('about:blank', '_blank');
      const result = await connectTelegram.mutateAsync(orgId);
      if (win) {
        win.location.href = result.botLink;
      } else {
        window.open(result.botLink, '_blank');
      }
      startPolling();
    } catch {
      // Silently fail — user can retry or skip
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <CardTitle>Connect Telegram notifications</CardTitle>
        </div>
        <CardDescription>
          Get notified when bookings start or assignments end. You can always connect later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Telegram connected!</p>
                {settings?.telegramUsername && (
                  <p className="text-xs text-green-600">@{settings.telegramUsername}</p>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={onSkip}>
              Go to Calendar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleConnect}
              disabled={connectTelegram.isPending || polling}
            >
              <Send className="mr-2 h-4 w-4" />
              {polling ? 'Waiting for connection...' : connectTelegram.isPending ? 'Generating link...' : 'Connect Telegram'}
            </Button>
            {polling && (
              <p className="text-sm text-center text-gray-500 animate-pulse">
                Open the bot in Telegram and press Start
              </p>
            )}
            <Button variant="ghost" className="w-full text-gray-500" onClick={onSkip}>
              Skip for now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

