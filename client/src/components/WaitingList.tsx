import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WaitingListEntry } from '@shared/schema';
import { dataStore } from '@/lib/dataStore';
import WaitingListModal from './WaitingListModal';
import { useToast } from '@/hooks/use-toast';
import { Clock, UserPlus, Users, User, CalendarRange, Mail, StickyNote, Trash2 } from 'lucide-react';

export default function WaitingList() {
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const allEntries = dataStore.getWaitingListEntries ?
        await dataStore.getWaitingListEntries() : [];
      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading waiting list:', error);
      toast({
        title: "Error",
        description: "Failed to load waiting list",
        variant: "destructive",
      });
    }
  };

  const handleAddEntry = async (entry: Omit<WaitingListEntry, 'id' | 'createdAt'>) => {
    try {
      const newEntry: WaitingListEntry = {
        ...entry,
        id: Date.now().toString(), // Use simple timestamp for better Supabase compatibility
        createdAt: new Date().toISOString(),
      };

      if (dataStore.saveWaitingListEntry) {
        await dataStore.saveWaitingListEntry(newEntry);
      }

      await loadEntries();
      toast({
        title: "Added to Waiting List",
        description: `${entry.name} has been added to the waiting list`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add entry to waiting list",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEntry = async (id: string, name: string) => {
    try {
      if (dataStore.deleteWaitingListEntry) {
        await dataStore.deleteWaitingListEntry(id);
      }

      await loadEntries();
      toast({
        title: "Removed from Waiting List",
        description: `${name} has been removed from the waiting list`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove entry",
        variant: "destructive",
      });
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Waiting List
          </CardTitle>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-10 w-10 mb-2 mx-auto text-gray-300" />
            <p>No one on the waiting list yet</p>
            <p className="text-sm">Add people who are interested in booking desks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium text-gray-900">{entry.name}</h4>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-3 w-3" />
                        <span>{entry.preferredDates}</span>
                      </div>

                      {entry.contactInfo && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{entry.contactInfo}</span>
                        </div>
                      )}

                      {entry.notes && (
                        <div className="flex items-start gap-2">
                          <StickyNote className="h-3 w-3 mt-0.5" />
                          <span>{entry.notes}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                        <Clock className="h-3 w-3" />
                        <span>Added {formatDate(entry.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntry(entry.id, entry.name)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <WaitingListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddEntry}
      />
    </Card>
  );
}
