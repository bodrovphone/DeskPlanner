import { WaitingListEntry } from '@shared/schema';

const WAITING_LIST_KEY = 'coworking-waiting-list';

export class WaitingListStore {
  private getStorageData(): Record<string, WaitingListEntry> {
    try {
      const data = localStorage.getItem(WAITING_LIST_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading waiting list from localStorage:', error);
      return {};
    }
  }

  private saveStorageData(data: Record<string, WaitingListEntry>): void {
    try {
      localStorage.setItem(WAITING_LIST_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving waiting list to localStorage:', error);
      throw new Error('Failed to save waiting list data');
    }
  }

  async getAllEntries(): Promise<WaitingListEntry[]> {
    const data = this.getStorageData();
    return Object.values(data).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addEntry(entry: Omit<WaitingListEntry, 'id' | 'createdAt'>): Promise<WaitingListEntry> {
    const data = this.getStorageData();
    const id = `waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: WaitingListEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };
    
    data[id] = newEntry;
    this.saveStorageData(data);
    return newEntry;
  }

  async removeEntry(id: string): Promise<void> {
    const data = this.getStorageData();
    delete data[id];
    this.saveStorageData(data);
  }

  async updateEntry(id: string, updates: Partial<WaitingListEntry>): Promise<WaitingListEntry | null> {
    const data = this.getStorageData();
    if (!data[id]) {
      return null;
    }
    
    data[id] = { ...data[id], ...updates };
    this.saveStorageData(data);
    return data[id];
  }

  async clearAll(): Promise<void> {
    this.saveStorageData({});
  }
}

export const waitingListStore = new WaitingListStore();