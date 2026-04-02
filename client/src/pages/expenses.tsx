import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  useExpenses,
  useDeleteExpense,
  useExpenseCategories,
  useCreateExpenseCategory,
  useRenameExpenseCategory,
  useDeleteExpenseCategory,
} from '@/hooks/use-expenses';
import { useOrganization } from '@/contexts/OrganizationContext';
import { currencySymbols } from '@/lib/settings';
import { getMonthRange, getMonthRangeString } from '@/lib/dateUtils';
import { Expense } from '@shared/schema';
import ExpenseModal from '@/components/ExpenseModal';
import RecurringExpenseModal from '@/components/RecurringExpenseModal';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Receipt,
  Trash2,
  Edit2,
  Check,
  X,
  Tag,
  Home,
  Coffee,
  Wifi,
  Zap,
  Calculator,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Icon map keyed by lowercase category name for the 6 known defaults
const defaultCategoryIcons: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  rent: { Icon: Home, color: 'text-purple-600' },
  supplies: { Icon: Coffee, color: 'text-green-600' },
  internet: { Icon: Wifi, color: 'text-blue-600' },
  bills: { Icon: Zap, color: 'text-yellow-600' },
  accountant: { Icon: Calculator, color: 'text-indigo-600' },
  other: { Icon: MoreHorizontal, color: 'text-gray-600' },
};

function getCategoryIcon(name: string): { Icon: React.ComponentType<{ className?: string }>; color: string } {
  return defaultCategoryIcons[name.toLowerCase()] ?? { Icon: Tag, color: 'text-gray-500' };
}

function formatExpenseDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ExpensesPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { toast } = useToast();
  const deleteExpense = useDeleteExpense();
  const createCategory = useCreateExpenseCategory();
  const renameCategory = useRenameExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();
  const { currentOrg } = useOrganization();

  const currentMonth = useMemo(() => getMonthRange(monthOffset), [monthOffset]);
  const monthStart = currentMonth[0]?.dateString ?? '';
  const monthEnd = currentMonth[currentMonth.length - 1]?.dateString ?? '';
  const monthLabel = getMonthRangeString(monthOffset);

  const { data: expenses = [] } = useExpenses(monthStart, monthEnd);
  const { data: categories = [] } = useExpenseCategories();

  const catById = useMemo(
    () => Object.fromEntries(categories.map(c => [c.id, c])),
    [categories]
  );

  const currencySymbol = currentOrg?.currency
    ? currencySymbols[currentOrg.currency]
    : '€';

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const formatCurrency = (value: number) =>
    `${currencySymbol}${value.toFixed(2)}`;

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast({ title: 'Expense Deleted', description: 'The expense has been removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete expense', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast({ title: 'Category Deleted', description: 'The category has been removed' });
    } catch {
      toast({
        title: 'Cannot Delete Category',
        description: 'This category is used by existing expenses',
        variant: 'destructive',
      });
    }
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const startEditCategory = (id: string, name: string) => {
    setEditingCategoryId(id);
    setEditingCategoryName(name);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleRenameCategory = async (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    try {
      await renameCategory.mutateAsync({ id, name: trimmed });
      setEditingCategoryId(null);
      setEditingCategoryName('');
      toast({ title: 'Category renamed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to rename category', variant: 'destructive' });
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync(trimmed);
      setNewCategoryName('');
      setAddingCategory(false);
      toast({ title: 'Category added' });
    } catch {
      toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRecurringModalOpen(true)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Settings className="h-4 w-4 mr-1" />
            Recurring
          </Button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setMonthOffset((o) => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-medium text-gray-700">{monthLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonthOffset((o) => o + 1)}
          disabled={monthOffset >= 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary line */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <Receipt className="h-4 w-4 text-red-500" />
        <span>
          Total:{' '}
          <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
          {' · '}
          {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border rounded-lg bg-white">
          No expenses recorded for {monthLabel}.
        </div>
      ) : (
        <div className="border rounded-lg bg-white divide-y">
          {expenses.map((expense) => {
            const cat = catById[expense.categoryId];
            const catName = cat?.name ?? expense.categoryName ?? '—';
            const { Icon: CategoryIcon, color } = getCategoryIcon(catName);
            return (
              <div
                key={expense.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 gap-2"
              >
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <CategoryIcon className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {formatExpenseDate(expense.date)}
                      </span>
                      <span className="text-gray-600 text-sm">
                        {catName}
                      </span>
                      {expense.isRecurring && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                          Auto
                        </span>
                      )}
                    </div>
                    {expense.description && (
                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                        {expense.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 pl-6 sm:pl-0">
                  <span className="font-bold text-red-600 text-sm sm:text-base">
                    {currencySymbol}{expense.amount.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditExpense(expense)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Categories section */}
      {categories.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
            {!addingCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingCategory(true)}
                className="text-gray-500 hover:text-gray-700 h-7 px-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>
          <div className="border rounded-lg bg-white divide-y">
            {categories.map((cat) => {
              const { Icon: CatIcon, color } = getCategoryIcon(cat.name);
              const usageCount = expenses.filter(e => e.categoryId === cat.id).length;
              const isEditing = editingCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 gap-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CatIcon className={`h-4 w-4 shrink-0 ${color}`} />
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCategory(cat.id);
                          if (e.key === 'Escape') cancelEditCategory();
                        }}
                        className="h-7 text-sm py-0 px-2 max-w-[200px]"
                      />
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        {usageCount > 0 && (
                          <span className="text-xs text-gray-400">
                            {usageCount} {usageCount === 1 ? 'expense' : 'expenses'} this month
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRenameCategory(cat.id)}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditCategory}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditCategory(cat.id, cat.name)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                          title="Rename category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {addingCategory && (
              <div className="flex items-center gap-2 p-3 border-t">
                <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                <Input
                  autoFocus
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
                  }}
                  className="h-7 text-sm py-0 px-2 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddCategory}
                  className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={handleCloseExpenseModal}
        expense={editingExpense}
      />
      <RecurringExpenseModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
      />
    </div>
  );
}
