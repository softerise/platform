import * as React from 'react';
import { useTable } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import {
  DataTableToolbar,
  LoadingSkeleton,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@project/ui';
import { GraduationCap, Eye, BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CourseStatusBadge, QualityScore } from './components';

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  qualityScore: number | null;
  totalEpisodes: number;
  totalDuration: number | null;
  language: string;
  bookId: string;
  book?: {
    title: string;
  };
  createdAt: string;
}

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Deployed', value: 'DEPLOYED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export function CourseListPage() {
  const navigate = useNavigate();

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<Course>({
    resource: 'courses',
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch } = tableQueryResult;
  const courses = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = current ?? 1;
  const currentPageSize = pageSize ?? 25;
  const activeFilters = filters ?? [];

  const [search, setSearch] = React.useState('');

  const filterValues = React.useMemo(() => {
    const values: Record<string, string> = {};
    activeFilters.forEach((filter) => {
      if ('field' in filter) {
        values[filter.field] = String(filter.value || '');
      }
    });
    return values;
  }, [activeFilters]);

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

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev = []) => {
      const withoutKey = prev.filter(
        (filter) => 'field' in filter && filter.field !== key,
      );
      if (!value || value === 'all') return withoutKey;
      return [...withoutKey, { field: key, operator: 'eq' as const, value }];
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Courses</h1>
        </div>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load courses</p>
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
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage generated courses
          </p>
        </div>
      </div>

      <DataTableToolbar
        searchPlaceholder="Search by title..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: 'status', label: 'Status', options: statusOptions },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses found"
          description={
            search || Object.keys(filterValues).length > 0
              ? 'Try adjusting your search or filters'
              : 'Courses are generated from pipelines. Start a pipeline to create a course.'
          }
          action={
            search || Object.keys(filterValues).length > 0
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setSearch('');
                    setFilters([]);
                  },
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Quality</TableHead>
                  <TableHead className="w-[100px]">Episodes</TableHead>
                  <TableHead className="w-[100px]">Duration</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/courses/${course.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.book?.title ?? 'Unknown Book'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CourseStatusBadge status={course.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <QualityScore score={course.qualityScore} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span className="tabular-nums">{course.totalEpisodes}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="tabular-nums">
                          {course.totalDuration ? `${course.totalDuration} min` : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(course.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/courses/${course.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * currentPageSize + 1} to{' '}
              {Math.min(currentPage * currentPageSize, total)} of {total} courses
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

export default CourseListPage;

