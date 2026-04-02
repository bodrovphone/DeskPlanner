import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { RecurringExpense, Currency } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useRecurringExpenses,
  useSaveRecurringExpense,
  useDeleteRecurringExpense,
  useExpenseCategories,
  useCreateExpenseCategory,
} from '@/hooks/use-expenses';
import { useToast } from '@/hooks/use-toast';
import {
  Trash2, Plus, Edit2, Repeat, Loader2, Check, Tag, ChevronsUpDown,
} from 'lucide-react';

interface RecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecurringExpenseModal({ isOpen, onClose }: RecurringExpenseModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const { data: recurringExpenses = [], isLoading } = useRecurringExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const saveRecurringExpense = useSaveRecurringExpense();
  const deleteRecurringExpense = useDeleteRecurringExpense();
  const createCategory = useCreateExpenseCategory();

  useEffect(() => {
    if (isOpen && !isEditing) {
      resetForm();
    }
  }, [isOpen]);

  // When categories load and no category selected, pick first
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setAmount('');
    setCategoryId(categories[0]?.id ?? '');
    setDescription('');
    setDayOfMonth('1');
    setIsActive(true);
    setCurrency(currentOrg?.currency || 'EUR');
    setCategorySearch('');
  };

  const handleEdit = (expense: RecurringExpense) => {
    setIsEditing(true);
    setEditingId(expense.id);
    setAmount(expense.amount.toString());
    setCategoryId(expense.categoryId);
    setDescription(expense.description || '');
    setDayOfMonth(expense.dayOfMonth.toString());
    setIsActive(expense.isActive);
    setCurrency(expense.currency);
    setCategorySearch('');
  };

  const selectedCategoryName = categories.find(c => c.id === categoryId)?.name ?? '';

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const showCreateOption =
    categorySearch.trim().length > 0 &&
    !categories.some(c => c.name.toLowerCase() === categorySearch.trim().toLowerCase());

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
    setCategoryOpen(false);
    setCategorySearch('');
  };

  const handleCreateCategory = async () => {
    const name = categorySearch.trim();
    if (!name) return;
    try {
      const created = await createCategory.mutateAsync(name);
      setCategoryId(created.id);
      setCategoryOpen(false);
      setCategorySearch('');
    } catch {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    const parsedDay = parseInt(dayOfMonth);

    if (parsedAmount >= 0 && parsedDay >= 1 && parsedDay <= 28 && categoryId) {
      try {
        const expenseData: RecurringExpense = {
          id: editingId || `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount: parsedAmount,
          currency,
          categoryId,
          categoryName: selectedCategoryName,
          description: description.trim() || undefined,
          dayOfMonth: parsedDay,
          isActive,
          createdAt: new Date().toISOString(),
        };

        await saveRecurringExpense.mutateAsync(expenseData);

        toast({
          title: editingId ? 'Recurring Expense Updated' : 'Recurring Expense Added',
          description: `${selectedCategoryName} - ${currencySymbols[currency]}${parsedAmount.toFixed(2)}/month on day ${parsedDay}`,
        });

        resetForm();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save recurring expense',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurringExpense.mutateAsync(id);
      toast({
        title: 'Recurring Expense Deleted',
        description: 'The recurring expense has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete recurring expense',
        variant: 'destructive',
      });
    }
  };

  const isValidForm = amount.trim() &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) >= 0 &&
    dayOfMonth.trim() &&
    !isNaN(parseInt(dayOfMonth)) &&
    parseInt(dayOfMonth) >= 1 &&
    parseInt(dayOfMonth) <= 28 &&
    !!categoryId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-purple-600" />
            Manage Recurring Expenses
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Recurring Expenses List */}
          {recurringExpenses.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Active Templates</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recurringExpenses.map((expense) => {
                  const catName = expense.categoryName
                    || categories.find(c => c.id === expense.categoryId)?.name
                    || '—';
                  return (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        expense.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${expense.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {catName}
                            </span>
                            {!expense.isActive && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {currencySymbols[expense.currency]}{expense.amount.toFixed(2)} on day {expense.dayOfMonth}
                          </div>
                          {expense.description && (
                            <div className="text-xs text-gray-400">{expense.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Edit2 className="h-4 w-4 text-purple-600" />
              ) : (
                <Plus className="h-4 w-4 text-purple-600" />
              )}
              <Label className="text-sm font-medium text-gray-700">
                {isEditing ? 'Edit Recurring Expense' : 'Add New Recurring Expense'}
              </Label>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Category *</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="mt-1 w-full justify-between font-normal"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Tag className="h-4 w-4 text-gray-500 shrink-0" />
                      {selectedCategoryName || 'Select category...'}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-gray-400 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search or create..."
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {showCreateOption ? null : 'No categories found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCategories.map(cat => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => handleSelectCategory(cat.id)}
                          >
                            <Tag className="h-4 w-4 mr-2 text-gray-400" />
                            {cat.name}
                            {cat.id === categoryId && <Check className="h-4 w-4 ml-auto text-green-600" />}
                          </CommandItem>
                        ))}
                        {showCreateOption && (
                          <CommandItem
                            value={`__create__${categorySearch}`}
                            onSelect={handleCreateCategory}
                            className="text-blue-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create "{categorySearch.trim()}"
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recurringAmount" className="text-sm font-medium text-gray-700">
                  Amount ({currencySymbols[currency]}) *
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    {currencySymbols[currency]}
                  </span>
                  <Input
                    id="recurringAmount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dayOfMonth" className="text-sm font-medium text-gray-700">
                  Day of Month *
                </Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="1"
                  min="1"
                  max="28"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">1-28 only</p>
              </div>
            </div>

            <div>
              <Label htmlFor="recurringDescription" className="text-sm font-medium text-gray-700">
                Description (Optional)
              </Label>
              <Textarea
                id="recurringDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly office rent..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="text-sm text-gray-700">
                  Active (auto-generate each month)
                </Label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {isEditing && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!isValidForm || saveRecurringExpense.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saveRecurringExpense.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {isEditing ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isEditing ? 'Update' : 'Add'} Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
