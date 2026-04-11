interface StatusLegendProps {
  counts?: { available: number; booked: number; assigned: number };
  totalDeskDays?: number;
  stripePaidCount?: number;
}

export default function StatusLegend({ counts, totalDeskDays, stripePaidCount }: StatusLegendProps) {
  return (
    <div className="flex items-center flex-wrap gap-4">
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
      {stripePaidCount !== undefined && stripePaidCount > 0 && (
        <div className="flex items-center" title="Paid via Stripe Checkout">
          <div
            className="w-0 h-0 mr-1.5"
            style={{
              borderRight: '10px solid transparent',
              borderTop: '10px solid #635BFF',
            }}
          />
          <span className="text-sm text-gray-600">
            Paid via Stripe ({stripePaidCount})
          </span>
        </div>
      )}
      {totalDeskDays !== undefined && (
        <div className="flex items-center">
          <span className="text-sm text-gray-400">Total: {totalDeskDays} desk-days</span>
        </div>
      )}
    </div>
  );
}
