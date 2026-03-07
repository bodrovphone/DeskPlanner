interface StatusLegendProps {
  counts?: { available: number; booked: number; assigned: number };
  totalDeskDays?: number;
}

export default function StatusLegend({ counts, totalDeskDays }: StatusLegendProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">
          Available{counts ? ` (${counts.available})` : ''}
        </span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-orange-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">
          Booked{counts ? ` (${counts.booked})` : ''}
        </span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">
          Assigned{counts ? ` (${counts.assigned})` : ''}
        </span>
      </div>
      {totalDeskDays !== undefined && (
        <div className="flex items-center">
          <span className="text-sm text-gray-400">Total: {totalDeskDays} desk-days</span>
        </div>
      )}
    </div>
  );
}
