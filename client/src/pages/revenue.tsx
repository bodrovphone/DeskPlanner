import { useState, useMemo } from 'react';
import RevenueDashboard from '@/components/RevenueDashboard';
import RevenueChart from '@/components/RevenueChart';
import { getMonthRange } from '@/lib/dateUtils';

export default function RevenuePage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const currentMonth = useMemo(() => getMonthRange(monthOffset), [monthOffset]);

  const startDate = currentMonth[0]?.dateString;
  const endDate = currentMonth[currentMonth.length - 1]?.dateString;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Revenue Dashboard</h1>
      <RevenueChart />
      <div className="mt-6">
        <RevenueDashboard
          viewMode="month"
          monthOffset={monthOffset}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
}
