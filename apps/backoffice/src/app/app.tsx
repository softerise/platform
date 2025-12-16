import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Booking } from '@project/contracts';
import { Button, Card } from '@project/ui';
import { Route, Routes } from 'react-router-dom';
import { env } from '../config/env';

const API_URL = env.VITE_API_URL;
const queryClient = new QueryClient();

const normalizeBookings = (raw: unknown): Booking[] => {
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const booking = item as Booking & {
      bookingDate: string | Date;
      createdAt?: string | Date;
      updatedAt?: string | Date;
    };
    return {
      ...booking,
      bookingDate: new Date(booking.bookingDate),
      createdAt: new Date(booking.createdAt ?? booking.bookingDate),
      updatedAt: new Date(booking.updatedAt ?? booking.bookingDate),
    };
  });
};

function BookingList() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: async (): Promise<Booking[]> => {
      const res = await fetch(`${API_URL}/bookings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return normalizeBookings(json);
    },
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading bookings…</p>;
  }

  if (error) {
    return (
      <Card
        title="Bookings"
        description="API'dan veri çekilirken hata oluştu"
        actions={
          <Button variant="secondary" onClick={() => refetch()}>
            Tekrar dene
          </Button>
        }
      >
        <p className="text-sm text-red-600">{String(error)}</p>
      </Card>
    );
  }

  const bookings = data ?? [];

  return (
    <Card
      title="Bookings"
      description="API'dan gelen son kayıtlar"
      actions={
        <Button variant="secondary" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? 'Yükleniyor…' : 'Yenile'}
        </Button>
      }
    >
      <div className="grid gap-2">
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Kayıt bulunamadı.</p>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {booking.currency} {booking.totalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(booking.bookingDate).toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase text-white">
                {booking.id.slice(0, 8)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-600">
                Backoffice
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Operations Console
              </h1>
              <p className="text-sm text-slate-500">
                Vite + Tailwind baseline (API tüketimi hazır)
              </p>
            </div>
            <Button>Yeni Booking</Button>
          </header>
          <Routes>
            <Route path="/" element={<BookingList />} />
          </Routes>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
