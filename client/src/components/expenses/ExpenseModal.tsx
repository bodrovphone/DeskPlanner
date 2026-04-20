import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Expense, Currency } from '@shared/schema';
import { currencySymbols } from '@/lib/settings';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSaveExpense, useExpenseCategories, useCreateExpenseCategory } from '@/hooks/use-expenses';
import { useToast } from '@/hooks/use-toast';
import { Receipt, Loader2, Check } from 'lucide-react';
import { CategoryCombobox } from './CategoryCombobox';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const saveExpense = useSaveExpense();
  const { data: categories = [] } = useExpenseCategories();
  const createCategory = useCreateExpenseCategory();

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setDate(expense.date);
        setAmount(expense.amount.toString());
        setCategoryId(expense.categoryId);
        setDescription(expense.description || '');
        setCurrency(expense.currency);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        setCategoryId(categories[0]?.id ?? '');
        setDescription('');
        setCurrency(currentOrg?.currency || 'EUR');
      }
    }
  }, [isOpen, expense]);

  // When categories load and no category selected, pick first
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  const selectedCategoryName = categories.find(c => c.id === categoryId)?.name ?? '';

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);

    if (date && parsedAmount >= 0 && categoryId) {
      try {
        setIsLoading(true);

        const expenseData: Expense = {
          id: expense?.id || `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          amount: parsedAmount,
          currency,
          categoryId,
          categoryName: selectedCategoryName,
          description: description.trim() || undefined,
          isRecurring: expense?.isRecurring || false,
          recurringExpenseId: expense?.recurringExpenseId,
          createdAt: expense?.createdAt || new Date().toISOString(),
        };

        await saveExpense.mutateAsync(expenseData);

        toast({
          title: expense ? 'Expense Updated' : 'Expense Added',
          description: `${selectedCategoryName} - ${currencySymbols[currency]}${parsedAmount.toFixed(2)}`,
        });

        onClose();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save expense',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const isValidForm = date && amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 0 && !!categoryId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-red-600" />
            {expense ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="expenseDate" className="text-sm font-medium text-gray-700">
              Date *
            </Label>
            <Input
              id="expenseDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">Category *</Label>
            <CategoryCombobox
              value={categoryId}
              onChange={setCategoryId}
              categories={categories}
              onCreateCategory={createCategory.mutateAsync}
            />
          </div>

          <div>
            <Label htmlFor="expenseAmount" className="text-sm font-medium text-gray-700">
              Amount ({currencySymbols[currency]}) *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                {currencySymbols[currency]}
              </span>
              <Input
                id="expenseAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="pl-8"
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expenseDescription" className="text-sm font-medium text-gray-700">
              Description (Optional)
            </Label>
            <Textarea
              id="expenseDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Monthly rent, Coffee beans and filters..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidForm || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {expense ? 'Update' : 'Add'} Expense
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Tip: Press Ctrl+Enter to save quickly
        </div>
      </DialogContent>
    </Dialog>
  );
}
