import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getHealth } from '@project/api-client';
import { Button, Card } from '@project/ui';
import { Route, Routes } from 'react-router-dom';
import { env } from '../config/env';

const API_URL = env.VITE_API_URL;
const queryClient = new QueryClient();

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
            <Route path="/" element={<HealthPanel />} />
          </Routes>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
