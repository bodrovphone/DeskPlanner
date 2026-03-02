import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';

interface CalendarNavigationProps {
  viewMode: 'week' | 'month';
  setViewMode: (mode: 'week' | 'month') => void;
  rangeString: string;
  onPrev: () => void;
  onNext: () => void;
  onQuickBook: () => void;
  quickBookDisabled: boolean;
  quickBookLoading: boolean;
}

export default function CalendarNavigation({
  viewMode,
  setViewMode,
  rangeString,
  onPrev,
  onNext,
  onQuickBook,
  quickBookDisabled,
  quickBookLoading,
}: CalendarNavigationProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-base font-medium text-gray-900 ml-2">
              {rangeString}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200">
              <Button
                variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className={`rounded-r-none ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className={`rounded-l-none ${viewMode === 'month' ? 'bg-blue-100 text-blue-700' : ''}`}
              >
                Month
              </Button>
            </div>

            <Button
              onClick={onQuickBook}
              disabled={quickBookDisabled || quickBookLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {quickBookLoading ? 'Loading...' : 'Book Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
