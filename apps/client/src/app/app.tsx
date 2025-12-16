import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getHealth } from '@project/api-client';
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

function HealthPanel() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['health'],
    queryFn: () => getHealth(API_URL),
  });

  return (
    <Card
      title="API Health"
      description="NestJS + Prisma + Pino + BullMQ stack"
      actions={
        <Button variant="secondary" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? 'Yükleniyor…' : 'Yenile'}
        </Button>
      }
    >
      {isLoading && <p className="text-sm text-slate-500">Yükleniyor…</p>}
      {error && (
        <p className="text-sm text-red-600">
          Sağlık kontrolü başarısız: {String(error)}
        </p>
      )}
      {data && (
        <div className="space-y-1 text-sm text-slate-800">
          <p>
            <strong>Durum:</strong> {data.status}
          </p>
          <p>
            <strong>Versiyon:</strong> {data.version}
          </p>
          <p>
            <strong>Env:</strong> {data.environment}
          </p>
        </div>
      )}
    </Card>
  );
}

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
      {isLoading && <p className="text-sm text-slate-500">Yükleniyor…</p>}
      {error && (
        <p className="text-sm text-red-600">
          Bookings çekilemedi: {String(error)}
        </p>
      )}
      {data && (
        <div className="grid gap-2">
          {data.length === 0 ? (
            <p className="text-sm text-slate-500">Kayıt bulunamadı.</p>
          ) : (
            data.map((booking) => (
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
      )}
    </Card>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-wide text-indigo-600">
              Client App
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Customer Portal Starter
            </h1>
            <p className="text-sm text-slate-500">
              Vite + Refine + Tailwind + MSW/Playwright hazır baseline
            </p>
          </header>
          <Routes>
            <Route
              path="/"
              element={
                <div className="space-y-4">
                  <HealthPanel />
                  <BookingList />
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
