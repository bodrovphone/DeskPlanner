import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, CalendarX, User } from 'lucide-react';

interface StatsCardsProps {
  stats: { available: number; assigned: number; booked: number };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Available</p>
              <p className="text-lg font-semibold text-green-600">{stats.available}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarX className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Booked</p>
              <p className="text-lg font-semibold text-orange-600">{stats.booked}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Assigned</p>
              <p className="text-lg font-semibold text-blue-600">{stats.assigned}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
