export default function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-700">Available</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-orange-600 rounded mr-1.5"></div>
        <span className="text-sm text-gray-700">Booked</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded mr-1.5"></div>
        <span className="text-sm text-gray-700">Assigned</span>
      </div>
    </div>
  );
}
