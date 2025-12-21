import * as React from 'react';
import { useTable } from '@refinedev/core';
import {
  LoadingSkeleton,
  EmptyState,
  Button,
  Card,
  CardContent,
} from '@project/ui';
import { FileText, RefreshCw } from 'lucide-react';
import { AuditLogFilters } from './components/audit-log-filters';
import { AuditLogTable, type AuditLog } from './components/audit-log-table';

export function AuditLogListPage() {
  const [filters, setFilters] = React.useState({
    eventType: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: '',
  });

  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    setFilters: setTableFilters,
  } = useTable<AuditLog>({
    resource: 'audit-logs',
    pagination: { current: 1, pageSize: 50 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch, isFetching } = tableQueryResult;
  const auditLogs = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = current ?? 1;
  const currentPageSize = pageSize ?? 50;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const tableFilters = [];

      if (filters.eventType) {
        tableFilters.push({
          field: 'eventType',
          operator: 'eq' as const,
          value: filters.eventType,
        });
      }
      if (filters.startDate) {
        tableFilters.push({
          field: 'startDate',
          operator: 'gte' as const,
          value: filters.startDate.toISOString(),
        });
      }
      if (filters.endDate) {
        tableFilters.push({
          field: 'endDate',
          operator: 'lte' as const,
          value: filters.endDate.toISOString(),
        });
      }
      if (filters.search) {
        tableFilters.push({
          field: 'search',
          operator: 'contains' as const,
          value: filters.search,
        });
      }

      setTableFilters(tableFilters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, setTableFilters]);

  const clearFilters = () => {
    setFilters({
      eventType: '',
      startDate: null,
      endDate: null,
      search: '',
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <LoadingSkeleton variant="page" rows={15} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load audit logs</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AuditLogFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
          />
        </CardContent>
      </Card>

      {auditLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description="Try adjusting your filters or date range"
          action={
            filters.eventType || filters.startDate || filters.endDate || filters.search
              ? { label: 'Clear Filters', onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <>
          <AuditLogTable
            auditLogs={auditLogs}
            expandedRows={expandedRows}
            onToggle={toggleRow}
          />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * currentPageSize + 1} to{' '}
              {Math.min(currentPage * currentPageSize, total)} of {total} logs
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

export default AuditLogListPage;

