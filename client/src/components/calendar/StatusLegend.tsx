export default function StatusLegend() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">Available</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-orange-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">Booked</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded mr-1.5"></div>
        <span className="text-sm text-gray-600">Assigned</span>
      </div>
    </div>
  );
}
