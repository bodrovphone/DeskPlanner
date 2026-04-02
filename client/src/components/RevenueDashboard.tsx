import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useMonthlyStats, useDateRangeStats } from '@/hooks/use-monthly-stats';
import { useExpenses } from '@/hooks/use-expenses';
import { useMeetingRoomBookingsRange } from '@/hooks/use-meeting-room-bookings';
import { useOrganization } from '@/contexts/OrganizationContext';
import { currencySymbols } from '@/lib/settings';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, TrendingDown, Banknote, Receipt, Armchair, BarChart3,
  DoorOpen
} from 'lucide-react';

interface RevenueDashboardProps {
  viewMode: 'week' | 'month';
  monthOffset?: number;
  startDate?: string;
  endDate?: string;
}

export default function RevenueDashboard({ viewMode, monthOffset = 0, startDate, endDate }: RevenueDashboardProps) {
  const { currentOrg, hasMeetingRooms } = useOrganization();
  const defaultPricePerDay = currentOrg?.defaultPricePerDay ?? 8;

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
  const { data: expenses = [] } = useExpenses(expensesStartDate, expensesEndDate);

  // Fetch meeting room bookings for the period
  const { data: mrBookings = [] } = useMeetingRoomBookingsRange(currentOrg?.id, expensesStartDate, expensesEndDate);
  const meetingRoomRevenue = mrBookings.reduce((sum, b) => sum + (b.price ?? 0), 0);

  const isWeekView = viewMode === 'week';
  const { data: stats, isLoading } = isWeekView ? dateRangeStats : monthlyStats;

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate net profit (desk revenue + meeting room revenue - expenses)
  const netProfit = (stats?.totalRevenue || 0) + meetingRoomRevenue - totalExpenses;

  // Format period label based on view mode
  const periodLabel = isWeekView && startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const currencySymbol = stats ? currencySymbols[stats.currency] : '$';

  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  const title = isWeekView ? 'Weekly Revenue & Occupancy' : 'Monthly Revenue & Occupancy';

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-xs text-gray-500">{periodLabel}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {isLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
              <Skeleton className="h-4" />
            </div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                {/* Net Profit - First */}
                <div className={`p-2 rounded-lg border ${
                  netProfit >= 0
                    ? 'bg-green-50 border-green-100'
                    : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex items-center gap-1">
                    {netProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    )}
                    <span className="text-xs text-gray-600">Net Profit</span>
                  </div>
                  <div className={`text-base font-bold mt-0.5 ${
                    netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(netProfit)}
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                    <span className="text-xs text-gray-600">Desk Revenue</span>
                  </div>
                  <div className="text-base font-bold text-yellow-600 mt-0.5">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                </div>

                {/* Meeting Room Revenue (only when enabled) */}
                {hasMeetingRooms && (
                  <div className="p-2 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-1">
                      <DoorOpen className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                      <span className="text-xs text-gray-600">Room Revenue</span>
                    </div>
                    <div className="text-base font-bold text-orange-600 mt-0.5">
                      {formatCurrency(meetingRoomRevenue)}
                    </div>
                    <div className="text-xs text-gray-400">{mrBookings.length} bookings</div>
                  </div>
                )}

                {/* Total Expenses */}
                <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="text-xs text-gray-600">Expenses</span>
                  </div>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <div className="text-xs text-gray-400">{expenses.length} items</div>
                </div>

                {/* Occupancy Rate */}
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-1">
                    <Armchair className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span className="text-xs text-gray-600">Occupancy</span>
                  </div>
                  <div className="text-base font-bold text-purple-600 mt-0.5">
                    {Math.floor(stats.occupancyRate)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {stats.occupiedDays}/{stats.totalDeskDays}
                  </div>
                </div>

                {/* Revenue per Assigned Day */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 bg-teal-50 rounded-lg border border-teal-100 cursor-help">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="text-xs text-gray-600">Avg/Day</span>
                        </div>
                        <div className="text-base font-bold text-teal-600 mt-0.5">
                          {formatCurrency(stats.revenuePerOccupiedDay)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Paid revenue divided by assigned (paid) desk-days on working days only. Weekends, booked, and available days are excluded.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Max Revenue */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-help">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span className="text-xs text-gray-600">Max Revenue</span>
                        </div>
                        <div className="text-base font-bold text-gray-500 mt-0.5">
                          {formatCurrency(stats.totalDeskDays * defaultPricePerDay)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stats.totalDeskDays} × {currencySymbol}{defaultPricePerDay}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Maximum possible revenue if every desk-day were occupied at the default price ({currencySymbol}{defaultPricePerDay}/day).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Occupancy Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">Occupancy Rate</span>
                  <span className="font-medium">{Math.floor(stats.occupancyRate)}%</span>
                </div>
                <Progress value={stats.occupancyRate} className="h-2" />
              </div>

            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No data available for this {isWeekView ? 'week' : 'month'}
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}
