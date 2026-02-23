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
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 justify-center sm:justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="p-2 rounded-full touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <div className="flex flex-col">
              <h2 className="text-lg font-medium text-gray-900">
                {rangeString}
              </h2>
              <p className="text-sm text-gray-500">
                {viewMode === 'week' ? 'Week View' : 'Month View'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="p-2 rounded-full touch-manipulation"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={`touch-manipulation ${viewMode === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={`touch-manipulation ${viewMode === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Month
            </Button>
          </div>
        </div>
        <div className="sm:hidden mt-4">
          <Button
            onClick={onQuickBook}
            disabled={quickBookDisabled || quickBookLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white touch-manipulation"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {quickBookLoading ? 'Loading...' : 'Book Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
