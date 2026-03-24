import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Client } from '@shared/schema';
import { useDataStore } from '@/contexts/DataStoreContext';
import { UserPlus, User } from 'lucide-react';

interface ClientAutocompleteProps {
  value: string;
  clientId?: string;
  onChange: (name: string, clientId?: string) => void;
  maxLength?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function ClientAutocomplete({
  value,
  clientId,
  onChange,
  maxLength = 40,
  autoFocus,
  onKeyDown,
}: ClientAutocompleteProps) {
  const dataStore = useDataStore();
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchClients = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 1 || !dataStore.searchClients) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await dataStore.searchClients(query);
      setSuggestions(results);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, [dataStore]);

  useEffect(() => {
    // Don't search if a client is already selected and name matches
    if (clientId) return;
    const timer = setTimeout(() => searchClients(value), 150);
    return () => clearTimeout(timer);
  }, [value, clientId, searchClients]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectClient = (client: Client) => {
    onChange(client.name, client.id);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.slice(0, maxLength);
    // Clear clientId when user types (they're changing the name)
    onChange(newValue, undefined);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        selectClient(suggestions[highlightedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInternal}
          onFocus={() => {
            if (value.trim() && !clientId) setIsOpen(true);
          }}
          placeholder="Enter name"
          maxLength={maxLength}
          className={`mt-1 ${clientId ? 'pr-8' : ''}`}
          autoFocus={autoFocus}
        />
        {clientId && (
          <User className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-blue-500" />
        )}
      </div>

      {isOpen && value.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {suggestions.length > 0 && (
            <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Existing clients
            </div>
          )}
          {suggestions.map((client, index) => (
            <button
              key={client.id}
              type="button"
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectClient(client);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-gray-900">{client.name}</span>
                {(client.contact || client.email) && (
                  <span className="text-gray-400 text-xs truncate">{client.contact || client.email}</span>
                )}
              </div>
            </button>
          ))}
          {!suggestions.some(c => c.name.toLowerCase() === value.trim().toLowerCase()) && (
            <>
              {suggestions.length > 0 && <div className="border-t border-gray-100" />}
              <button
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                  highlightedIndex === suggestions.length ? 'bg-green-50' : 'hover:bg-green-50'
                }`}
                onMouseDown={async (e) => {
                  e.preventDefault();
                  if (!dataStore.saveClient) return;
                  try {
                    const newClient = await dataStore.saveClient({
                      id: 'new-' + Date.now(),
                      organizationId: '',
                      name: value.trim(),
                      flexActive: false,
                      flexTotalDays: 0,
                      flexUsedDays: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    onChange(newClient.name, newClient.id);
                    setIsOpen(false);
                    setSuggestions([]);
                  } catch (err) {
                    console.error('Failed to create client:', err);
                  }
                }}
              >
                <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-green-700 font-medium">Create client "{value.trim()}"</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
