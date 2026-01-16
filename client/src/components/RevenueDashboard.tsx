import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useMonthlyStats, useDateRangeStats } from '@/hooks/use-monthly-stats';
import { useExpenses, useDeleteExpense } from '@/hooks/use-expenses';
import { currencySymbols } from '@/lib/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Expense, ExpenseCategory } from '@shared/schema';
import ExpenseModal from './ExpenseModal';
import RecurringExpenseModal from './RecurringExpenseModal';
import { ChevronDown, ChevronUp, Plus, Settings, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RevenueDashboardProps {
  viewMode: 'week' | 'month';
  monthOffset?: number;
  startDate?: string;
  endDate?: string;
}

const categoryLabels: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  supplies: 'Supplies',
  internet: 'Internet',
  bills: 'Bills',
  accountant: 'Accountant',
};

const categoryIcons: Record<ExpenseCategory, { icon: string; color: string }> = {
  rent: { icon: 'home', color: 'text-purple-600' },
  supplies: { icon: 'local_cafe', color: 'text-green-600' },
  internet: { icon: 'wifi', color: 'text-blue-600' },
  bills: { icon: 'bolt', color: 'text-yellow-600' },
  accountant: { icon: 'calculate', color: 'text-indigo-600' },
};

export default function RevenueDashboard({ viewMode, monthOffset = 0, startDate, endDate }: RevenueDashboardProps) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);

  const { toast } = useToast();
  const deleteExpense = useDeleteExpense();

  // Calculate year and month from offset for monthly view
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthOffset);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  // Calculate date range for expenses
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // Use different hooks based on view mode
  const monthlyStats = useMonthlyStats(year, month);
  const dateRangeStats = useDateRangeStats(startDate || '', endDate || '');

  // Fetch expenses for the period
  const expensesStartDate = viewMode === 'week' ? (startDate || monthStart) : monthStart;
  const expensesEndDate = viewMode === 'week' ? (endDate || monthEnd) : monthEnd;
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(expensesStartDate, expensesEndDate);

  const isWeekView = viewMode === 'week';
  const { data: stats, isLoading } = isWeekView ? dateRangeStats : monthlyStats;

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate net profit
  const netProfit = (stats?.totalRevenue || 0) - totalExpenses;

  // Owner's desk payment (€100/month, prorated for weekly view)
  const OWNER_MONTHLY_PAYMENT = 100;
  const ownerPayment = isWeekView && startDate && endDate
    ? (() => {
        // Calculate business days in the week
        const start = new Date(startDate);
        const end = new Date(endDate);
        let weekBusinessDays = 0;
        const current = new Date(start);
        while (current <= end) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) weekBusinessDays++;
          current.setDate(current.getDate() + 1);
        }
        // Approximate business days in a month (~22)
        return (weekBusinessDays / 22) * OWNER_MONTHLY_PAYMENT;
      })()
    : OWNER_MONTHLY_PAYMENT;
  const optimisticNetProfit = netProfit + ownerPayment;

  // Format period label based on view mode
  const periodLabel = isWeekView && startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const currencySymbol = stats ? currencySymbols[stats.currency] : '$';

  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  const title = isWeekView ? 'Weekly Revenue & Occupancy' : 'Monthly Revenue & Occupancy';

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast({
        title: 'Expense Deleted',
        description: 'The expense has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const formatExpenseDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-gray-500">{periodLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Expense</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecurringModalOpen(true)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50 flex-1 sm:flex-none"
              >
                <Settings className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Recurring</span>
                <span className="sm:hidden">Recurring</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-6" />
            </div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-6">
                {/* Net Profit - First */}
                <div className={`p-3 sm:p-4 rounded-lg border ${
                  netProfit >= 0
                    ? 'bg-green-50 border-green-100'
                    : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className={`material-icon text-base sm:text-xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netProfit >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600">Net Profit</span>
                  </div>
                  <div className={`text-lg sm:text-2xl font-bold mt-1 ${
                    netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatCurrency(optimisticNetProfit)} (if I paid)
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="material-icon text-yellow-600 text-base sm:text-xl">payments</span>
                    <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-yellow-600 mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="material-icon text-red-600 text-base sm:text-xl">receipt_long</span>
                    <span className="text-xs sm:text-sm text-gray-600">Expenses</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <div className="text-xs text-gray-400">{expenses.length} items</div>
                </div>

                {/* Occupancy Rate */}
                <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="material-icon text-purple-600 text-base sm:text-xl">event_seat</span>
                    <span className="text-xs sm:text-sm text-gray-600">Occupancy</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">
                    {stats.occupancyRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {stats.occupiedDays}/{stats.totalDeskDays}
                  </div>
                </div>

                {/* Revenue per Occupied Day */}
                <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-100 col-span-2 md:col-span-1">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="material-icon text-teal-600 text-base sm:text-xl">analytics</span>
                    <span className="text-xs sm:text-sm text-gray-600">Avg/Day</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-teal-600 mt-1">
                    {formatCurrency(stats.revenuePerOccupiedDay)}
                  </div>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Occupancy Rate</span>
                  <span className="font-medium">{stats.occupancyRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.occupancyRate} className="h-3" />
              </div>

              {/* Expenses List */}
              {expenses.length > 0 && (
                <div className="border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-icon text-red-600 text-base sm:text-xl">receipt_long</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        Expenses
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500">({expenses.length})</span>
                    </div>
                    {isExpensesExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {isExpensesExpanded && (
                    <div className="border-t divide-y">
                      {expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 gap-2"
                        >
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                            <span className={`material-icon ${categoryIcons[expense.category].color} text-base sm:text-xl`}>
                              {categoryIcons[expense.category].icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {formatExpenseDate(expense.date)}
                                </span>
                                <span className="text-gray-600 text-sm">
                                  {categoryLabels[expense.category]}
                                </span>
                                {expense.isRecurring && (
                                  <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
                                    Auto
                                  </span>
                                )}
                              </div>
                              {expense.description && (
                                <div className="text-xs sm:text-sm text-gray-500 truncate">{expense.description}</div>
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No data available for this {isWeekView ? 'week' : 'month'}
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
