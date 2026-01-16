import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, ExpenseCategory, Currency } from '@shared/schema';
import { currencySymbols, getCurrency } from '@/lib/settings';
import { useSaveExpense } from '@/hooks/use-expenses';
import { useToast } from '@/hooks/use-toast';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
}

const categoryLabels: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  supplies: 'Supplies (coffee, tea, water, etc.)',
  internet: 'Internet',
  bills: 'Bills (electricity, water)',
  accountant: 'Accountant',
};

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('supplies');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const saveExpense = useSaveExpense();

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setDate(expense.date);
        setAmount(expense.amount.toString());
        setCategory(expense.category);
        setDescription(expense.description || '');
        setCurrency(expense.currency);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        setCategory('supplies');
        setDescription('');
        setCurrency(getCurrency());
      }
    }
  }, [isOpen, expense]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);

    if (date && parsedAmount >= 0) {
      try {
        setIsLoading(true);

        const expenseData: Expense = {
          id: expense?.id || `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          amount: parsedAmount,
          currency,
          category,
          description: description.trim() || undefined,
          isRecurring: expense?.isRecurring || false,
          recurringExpenseId: expense?.recurringExpenseId,
          createdAt: expense?.createdAt || new Date().toISOString(),
        };

        await saveExpense.mutateAsync(expenseData);

        toast({
          title: expense ? 'Expense Updated' : 'Expense Added',
          description: `${categoryLabels[category]} - ${currencySymbols[currency]}${parsedAmount.toFixed(2)}`,
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

  const isValidForm = date && amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icon text-red-600">receipt_long</span>
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
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Category *
            </Label>
            <Select value={category} onValueChange={(value: ExpenseCategory) => setCategory(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-purple-600 text-sm">home</span>
                    <span>Rent</span>
                  </div>
                </SelectItem>
                <SelectItem value="supplies">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-green-600 text-sm">local_cafe</span>
                    <span>Supplies (coffee, tea, water, etc.)</span>
                  </div>
                </SelectItem>
                <SelectItem value="internet">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-blue-600 text-sm">wifi</span>
                    <span>Internet</span>
                  </div>
                </SelectItem>
                <SelectItem value="bills">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-yellow-600 text-sm">bolt</span>
                    <span>Bills (electricity, water)</span>
                  </div>
                </SelectItem>
                <SelectItem value="accountant">
                  <div className="flex items-center gap-2">
                    <span className="material-icon text-indigo-600 text-sm">calculate</span>
                    <span>Accountant</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
                <span className="material-icon text-sm mr-2 animate-spin">hourglass_empty</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-icon text-sm mr-2">check</span>
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
