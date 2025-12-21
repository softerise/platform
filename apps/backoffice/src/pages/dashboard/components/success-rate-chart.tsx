import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@project/ui';

interface SuccessRateChartProps {
  data: { week: string; rate: number }[];
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  // Calculate current vs previous
  const currentRate = data[data.length - 1]?.rate ?? 0;
  const previousRate = data[data.length - 2]?.rate ?? 0;
  const change = currentRate - previousRate;

  if (data.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Pipeline Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Pipeline Success Rate
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{currentRate}%</p>
            <p
              className={cn(
                'text-xs',
                change >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last week
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            <XAxis
              dataKey="week"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

