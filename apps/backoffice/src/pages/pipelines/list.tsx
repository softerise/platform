import * as React from 'react';
import { useTable, useNavigation } from '@refinedev/core';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  LoadingSkeleton,
  EmptyState,
} from '@project/ui';
import { Eye, AlertCircle, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PipelineStatusBadge } from './components/pipeline-status-badge';
import { PipelineProgress } from './components/pipeline-progress';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '-';
  }
}

interface Pipeline {
  id: string;
  bookId: string;
  status: string;
  progress: number;
  currentStep: string | null;
  book?: {
    title: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Running', value: 'RUNNING' },
  { label: 'Waiting Review', value: 'WAITING_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Paused', value: 'PAUSED' },
];

export function PipelineListPage() {
  const { push } = useNavigation();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<Pipeline>({
    resource: 'pipelines',
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch } = tableQueryResult;
  const rawData = data?.data;
  const pipelines: Pipeline[] = Array.isArray(rawData) ? rawData : [];
  const total = data?.total ?? 0;
  const currentPage = current ?? 1;
  const currentPageSize = pageSize ?? 25;

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev = []) => {
        const withoutSearch = prev.filter(
          (filter) => 'field' in filter && filter.field !== 'search',
        );

        if (!search) return withoutSearch;

        return [
          ...withoutSearch,
          { field: 'search', operator: 'contains' as const, value: search },
        ];
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, setFilters]);

  // Status filter
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setFilters((prev = []) => {
      const withoutStatus = prev.filter(
        (filter) => 'field' in filter && filter.field !== 'status',
      );
      if (!value || value === 'all') return withoutStatus;
      return [...withoutStatus, { field: 'status', operator: 'eq' as const, value }];
    });
  };

  // Count pending reviews
  const pendingReviewsCount = pipelines.filter(
    (p) => p.status === 'WAITING_REVIEW',
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pipelines</h1>
        </div>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Pipelines</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load pipelines</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipelines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage content generation pipelines
          </p>
        </div>
      </div>

      {/* Pending Reviews Alert */}
      {pendingReviewsCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <span className="text-sm">
            <strong>{pendingReviewsCount}</strong> pipeline(s) waiting for
            review
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => handleStatusChange('WAITING_REVIEW')}
          >
            View Pending
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by book title..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {pipelines.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No pipelines found"
          description={
            search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Pipelines will appear here once started'
          }
          action={
            search || statusFilter !== 'all'
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setSearch('');
                    handleStatusChange('all');
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <Card className="border border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Book
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-[140px]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-[180px]">
                      Progress
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-[140px]">
                      Current Step
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-[120px]">
                      Started
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-[80px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelines.map((pipeline) => (
                    <TableRow
                      key={pipeline.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => push(`/admin/pipelines/${pipeline.id}`)}
                    >
                      <TableCell className="font-medium">
                        {pipeline.book?.title ?? 'Unknown Book'}
                      </TableCell>
                      <TableCell>
                        <PipelineStatusBadge status={pipeline.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <PipelineProgress
                          progress={pipeline.progress ?? 0}
                          status={pipeline.status}
                          showLabel={false}
                        />
                        <span className="text-xs text-muted-foreground">
                          {pipeline.progress ?? 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pipeline.currentStep ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(pipeline.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            push(`/admin/pipelines/${pipeline.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * currentPageSize + 1} to{' '}
              {Math.min(currentPage * currentPageSize, total)} of {total}{' '}
              pipelines
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrent(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrent(currentPage + 1)}
                disabled={currentPage * currentPageSize >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PipelineListPage;

