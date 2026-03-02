import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
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
    color: '#ca8a04', // yellow-600 — matches Revenue widget
  },
  expenses: {
    label: 'Expenses',
    color: '#dc2626', // red-600 — matches Expenses widget
  },
  netProfit: {
    label: 'Net Profit',
    color: '#16a34a', // green-600 — matches Net Profit widget
  },
} satisfies ChartConfig;

export default function RevenueChart() {
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
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label: string) => label}
                  formatter={(value, name) => {
                    const cfg = chartConfig[name as keyof typeof chartConfig];
                    return (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">{cfg?.label ?? name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {symbol}{(value as number).toFixed(2)}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              stroke="var(--color-netProfit)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
