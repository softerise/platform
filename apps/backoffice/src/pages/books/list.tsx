import * as React from 'react';
import { useTable, useCustomMutation } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import {
  DataTableToolbar,
  LoadingSkeleton,
  EmptyState,
  ConfirmDialog,
  toast,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from '@project/ui';
import {
  BookOpen,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Play,
  FileText,
} from 'lucide-react';
import { VerdictBadge } from './components/verdict-badge';
import { EligibilityBadge } from './components/eligibility-badge';
import { PipelineStatusBadge } from './components/pipeline-status-badge';

interface Book {
  id: string;
  title: string;
  description: string;
  author?: string;
  language: string;
  s1Verdict?: string;
  s1Output?: {
    score: number;
    confidence: string;
    reasons?: string[];
  };
  isPipelineEligible: boolean;
  totalWordCount?: number;
  activePipelineId?: string;
  activePipelineStatus?: string;
  _count?: {
    chapters: number;
  };
  createdAt: string;
  updatedAt: string;
}

const verdictOptions = [
  { label: 'All Verdicts', value: 'all' },
  { label: 'Diamond', value: 'DIAMOND' },
  { label: 'Gold', value: 'GOLD' },
  { label: 'Silver', value: 'SILVER' },
  { label: 'Bronze', value: 'BRONZE' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Pending', value: 'PENDING' },
];

const eligibilityOptions = [
  { label: 'All', value: 'all' },
  { label: 'Eligible', value: 'true' },
  { label: 'Not Eligible', value: 'false' },
];

export function BookListPage() {
  const navigate = useNavigate();

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<Book>({
    resource: 'books',
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch } = tableQueryResult;
  const books = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = current ?? 1;
  const currentPageSize = pageSize ?? 25;
  const activeFilters = filters ?? [];

  const [search, setSearch] = React.useState('');
  const [startPipelineDialogOpen, setStartPipelineDialogOpen] =
    React.useState(false);
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null);

  const { mutate: startPipeline, isLoading: startingPipeline } =
    useCustomMutation();

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

  const handleStartPipelineClick = (book: Book) => {
    setSelectedBook(book);
    setStartPipelineDialogOpen(true);
  };

  const handleConfirmStartPipeline = () => {
    if (!selectedBook) return;

    startPipeline(
      {
        url: '/pipelines',
        method: 'post',
        values: { bookId: selectedBook.id },
      },
      {
        onSuccess: () => {
          toast.success('Pipeline started successfully');
          setStartPipelineDialogOpen(false);
          setSelectedBook(null);
          refetch();
        },
        onError: () => {
          toast.error('Failed to start pipeline');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Books</h1>
          <Button onClick={() => navigate('/admin/books/create')}>
            <BookOpen className="mr-2 h-4 w-4" />
            Add Book
          </Button>
        </div>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Books</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load books</p>
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
        <h1 className="text-2xl font-semibold">Books</h1>
        <Button onClick={() => navigate('/admin/books/create')}>
          <BookOpen className="mr-2 h-4 w-4" />
          Add Book
        </Button>
      </div>

      <DataTableToolbar
        searchPlaceholder="Search by title or author..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: 's1Verdict', label: 'Verdict', options: verdictOptions },
          {
            key: 'isPipelineEligible',
            label: 'Eligibility',
            options: eligibilityOptions,
          },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No books found"
          description={
            search || Object.keys(filterValues).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first book'
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
              : {
                  label: 'Add Book',
                  onClick: () => navigate('/admin/books/create'),
                }
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Verdict</TableHead>
                  <TableHead className="w-[140px]">Eligibility</TableHead>
                  <TableHead className="w-[100px]">Chapters</TableHead>
                  <TableHead className="w-[120px]">Word Count</TableHead>
                  <TableHead className="w-[120px]">Pipeline</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow
                    key={book.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/books/${book.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{book.title}</p>
                        {book.author && (
                          <p className="text-sm text-muted-foreground">
                            by {book.author}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={book.s1Verdict} size="sm" />
                    </TableCell>
                    <TableCell>
                      <EligibilityBadge
                        eligible={book.isPipelineEligible}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{book._count?.chapters ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums text-muted-foreground">
                        {book.totalWordCount?.toLocaleString() ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {book.activePipelineStatus ? (
                        <PipelineStatusBadge
                          status={book.activePipelineStatus}
                          size="sm"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(book.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/books/${book.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/books/${book.id}/edit`);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>

                          {book.isPipelineEligible && !book.activePipelineId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartPipelineClick(book);
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Start Pipeline
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * currentPageSize + 1} to{' '}
              {Math.min(currentPage * currentPageSize, total)} of {total} books
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

      <ConfirmDialog
        open={startPipelineDialogOpen}
        onOpenChange={setStartPipelineDialogOpen}
        title="Start Pipeline"
        description={`Are you sure you want to start the content pipeline for "${selectedBook?.title}"? This will process the book through all AI stages.`}
        confirmLabel="Start Pipeline"
        onConfirm={handleConfirmStartPipeline}
        loading={startingPipeline}
      />
    </div>
  );
}

export default BookListPage;

