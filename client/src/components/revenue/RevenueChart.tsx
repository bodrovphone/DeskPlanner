import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useRevenueHistory } from '@/hooks/use-monthly-stats';
import { useMonthlyStats } from '@/hooks/use-monthly-stats';
import { currencySymbols } from '@/lib/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#ca8a04',
  },
  netProfit: {
    label: 'Net Profit',
    color: '#16a34a',
  },
  expenses: {
    label: 'Expenses',
    color: '#dc2626',
  },
  occupancy: {
    label: 'Occupancy %',
    color: '#9333ea',
  },
  avgPerDay: {
    label: 'Avg/Day',
    color: '#0d9488',
  },
} satisfies ChartConfig;

export default function RevenueChart() {
  type SeriesKey = 'revenue' | 'netProfit' | 'expenses' | 'occupancy' | 'avgPerDay';
  const [visibleSeries, setVisibleSeries] = useState<Set<SeriesKey>>(new Set(['revenue', 'netProfit']));

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const months = isMobile ? 2 : 3;
  const { data: history, isLoading } = useRevenueHistory(months);
  const now = new Date();
  const { data: currentStats } = useMonthlyStats(now.getFullYear(), now.getMonth());
  const symbol = currentStats ? currencySymbols[currentStats.currency] : '$';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-5 w-5 shrink-0" />
          <span className="truncate">Revenue Trend (Last {months} Months)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
          <LineChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => value.split(' ')[0]}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${symbol}${value}`}
              width={45}
              fontSize={10}
            />
            {visibleSeries.has('occupancy') && (
              <YAxis
                yAxisId="percent"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value}%`}
                width={40}
                fontSize={10}
                domain={[0, 100]}
              />
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label: string) => label}
                  formatter={(value, name) => {
                    const cfg = chartConfig[name as keyof typeof chartConfig];
                    const isPercent = name === 'occupancy';
                    return (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">{cfg?.label ?? name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {isPercent ? `${value}%` : `${symbol}${(value as number).toFixed(2)}`}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            {visibleSeries.has('revenue') && (
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.has('netProfit') && (
              <Line type="monotone" dataKey="netProfit" stroke="var(--color-netProfit)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.has('expenses') && (
              <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.has('occupancy') && (
              <Line type="monotone" dataKey="occupancy" yAxisId="percent" stroke="var(--color-occupancy)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
          </LineChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-5 mt-3">
          {([
            ['revenue', 'Revenue'],
            ['netProfit', 'Net Profit'],
            ['expenses', 'Expenses'],
            ['occupancy', 'Occupancy'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={visibleSeries.has(key)}
                onCheckedChange={() => toggleSeries(key)}
              />
              <span
                className="text-sm font-medium"
                style={{ color: chartConfig[key].color }}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
