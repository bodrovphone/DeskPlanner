import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOrganization, useCheckSlugAvailable } from '@/hooks/use-organization';
import { useOrganization } from '@/contexts/OrganizationContext';
import { currencyLabels, currencySymbols, activeCurrencies } from '@/lib/settings';
import { Currency } from '@shared/schema';
import { Loader2, Building2, LayoutGrid, Coins, ArrowRight, ArrowLeft, Check } from 'lucide-react';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

const STEPS = ['Space Info', 'Rooms & Desks', 'Currency'] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const createOrg = useCreateOrganization();
  const checkSlug = useCheckSlugAvailable();
  const { hasOrganization } = useOrganization();

  // Redirect to calendar if user already has an org
  useEffect(() => {
    if (hasOrganization) {
      navigate('/app/calendar', { replace: true });
    }
  }, [hasOrganization, navigate]);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [roomsCount, setRoomsCount] = useState(2);
  const [desksPerRoom, setDesksPerRoom] = useState(4);
  const [roomNames, setRoomNames] = useState<string[]>(['Room 1', 'Room 2']);
  const [currency, setCurrency] = useState<Currency>('EUR');

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

  // Update room names when count changes
  useEffect(() => {
    setRoomNames(prev => {
      const newNames = [...prev];
      while (newNames.length < roomsCount) {
        newNames.push(`Room ${newNames.length + 1}`);
      }
      return newNames.slice(0, roomsCount);
    });
  }, [roomsCount]);

  const handleSubmit = async () => {
    try {
      await createOrg.mutateAsync({
        name,
        slug,
        roomsCount,
        desksPerRoom,
        currency,
        roomNames,
      });
      navigate('/app/calendar', { replace: true });
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const canProceedStep0 = name.trim().length > 0 && slug.length > 0 && slugAvailable === true;
  const canProceedStep1 = roomsCount > 0 && desksPerRoom > 0 && roomNames.every(n => n.trim().length > 0);

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
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={e => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="downtown-hub"
                />
                {slug && slugAvailable === true && (
                  <p className="text-sm text-green-600 mt-1">Slug is available</p>
                )}
                {slug && slugAvailable === false && (
                  <p className="text-sm text-red-600 mt-1">Slug is already taken</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(1)}
                disabled={!canProceedStep0}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Rooms</Label>
                  <Select value={String(roomsCount)} onValueChange={v => setRoomsCount(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Desks per Room</Label>
                  <Select value={String(desksPerRoom)} onValueChange={v => setDesksPerRoom(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room Names</Label>
                {roomNames.map((rn, i) => (
                  <Input
                    key={i}
                    value={rn}
                    onChange={e => {
                      const updated = [...roomNames];
                      updated[i] = e.target.value;
                      setRoomNames(updated);
                    }}
                    placeholder={`Room ${i + 1}`}
                  />
                ))}
              </div>

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  Preview: {roomsCount} room{roomsCount > 1 ? 's' : ''} x {desksPerRoom} desks = {roomsCount * desksPerRoom} total desks
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
              <div className="grid grid-cols-2 gap-3">
                {activeCurrencies.map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      currency === c
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
      </div>
    </div>
  );
}
