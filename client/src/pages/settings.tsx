import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, LayoutGrid, Save } from 'lucide-react';

export default function SettingsPage() {
  const { currentOrg, rooms, desks } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState(currentOrg?.name || '');

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('organizations')
        .update({ name: orgName })
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
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
            <CardDescription>Your current space configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rooms.map((room) => {
                const roomDesks = desks.filter((d) => d.roomId === room.id);
                return (
                  <div key={room.id} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{room.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {roomDesks.length} desk{roomDesks.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {roomDesks.map((desk) => (
                        <span
                          key={desk.id}
                          className="px-2 py-1 bg-white border rounded text-xs text-gray-600"
                        >
                          {desk.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {rooms.length === 0 && (
                <p className="text-sm text-gray-500">No rooms configured yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
