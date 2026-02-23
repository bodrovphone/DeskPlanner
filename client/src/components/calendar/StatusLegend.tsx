import { Card, CardContent } from '@/components/ui/card';

export default function StatusLegend() {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-600 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Booked</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Person Assigned</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
