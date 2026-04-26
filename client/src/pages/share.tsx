import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedBooking } from '@shared/schema';
import { SupabaseDataStore } from '@/lib/supabaseDataStore';
import { Loader2, CalendarCheck, Clock } from 'lucide-react';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<SharedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    SupabaseDataStore.getSharedBooking(token).then((data) => {
      if (data) {
        setBooking(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [token]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900">Booking not found</h1>
          <p className="text-gray-500 mt-1">This link may be invalid or the booking no longer exists.</p>
        </div>
      </div>
    );
  }

  if (booking.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Booking Ended</h1>
            <p className="text-gray-500 mt-2">
              This desk booking at <span className="font-medium">{booking.spaceName}</span> has ended.
            </p>
            <div className="mt-4 text-sm text-gray-400">
              {booking.roomName} / {booking.deskLabel}
            </div>
            <div className="text-sm text-gray-400">
              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <CalendarCheck className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Your desk is ready!</h1>

          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="text-sm text-blue-600 font-medium uppercase tracking-wide">{booking.spaceName}</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {booking.roomName} / {booking.deskLabel}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Period</p>
              <p className="text-gray-900 font-medium mt-1">
                {formatDate(booking.startDate)}
              </p>
              <p className="text-gray-400 text-sm">to</p>
              <p className="text-gray-900 font-medium">
                {formatDate(booking.endDate)}
              </p>
              <p className="text-xs text-gray-400 mt-1">End date included.</p>
            </div>

            {booking.title && (
              <div className="text-sm text-gray-600 italic">
                {booking.title}
              </div>
            )}

            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
              booking.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {booking.status}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center mt-6">
      <a
        href="https://ohmydesk.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        Powered by OhMyDesk
      </a>
    </div>
  );
}
