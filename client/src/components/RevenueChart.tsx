import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useRevenueHistory } from '@/hooks/use-monthly-stats';
import { useMonthlyStats } from '@/hooks/use-monthly-stats';
import { currencySymbols } from '@/lib/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

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
  const { data: history, isLoading } = useRevenueHistory(3);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Trend (Last 3 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => value.split(' ')[0]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${symbol}${value}`}
              width={70}
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
