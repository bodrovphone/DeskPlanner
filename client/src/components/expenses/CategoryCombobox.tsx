import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Plus, Tag } from 'lucide-react';
import type { ExpenseCategory } from '@shared/schema';

interface CategoryComboboxProps {
  value: string;
  onChange: (id: string) => void;
  categories: ExpenseCategory[];
  onCreateCategory: (name: string) => Promise<{ id: string }>;
}

export function CategoryCombobox({ value, onChange, categories, onCreateCategory }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const selectedName = categories.find(c => c.id === value)?.name ?? '';

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCreate =
    search.trim().length > 0 &&
    !categories.some(c => c.name.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    try {
      const created = await onCreateCategory(name);
      onChange(created.id);
      setOpen(false);
      setSearch('');
    } catch {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Tag className="h-4 w-4 text-gray-500 shrink-0" />
            {selectedName || 'Select category...'}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-gray-400 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {showCreate ? null : 'No categories found.'}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(cat => (
                <CommandItem
                  key={cat.id}
                  value={cat.name}
                  onSelect={() => handleSelect(cat.id)}
                >
                  <Tag className="h-4 w-4 mr-2 text-gray-400" />
                  {cat.name}
                  {cat.id === value && <Check className="h-4 w-4 ml-auto text-green-600" />}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={handleCreate}
                  className="text-blue-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create "{search.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
