import * as React from 'react';
import { useTable, useCan } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import {
  DataTableToolbar,
  LoadingSkeleton,
  EmptyState,
  StatusBadge,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@project/ui';
import {
  Users,
  MoreHorizontal,
  Eye,
  UserCog,
  Ban,
  UserCheck,
} from 'lucide-react';
import type { IUser } from '@project/contracts';

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending Verification', value: 'PENDING_VERIFICATION' },
  { label: 'Pending Onboarding', value: 'PENDING_ONBOARDING' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

const userTypeOptions = [
  { label: 'B2C', value: 'B2C' },
  { label: 'B2B', value: 'B2B' },
];

export function UserListPage() {
  const navigate = useNavigate();

  const { data: canSuspend } = useCan({ resource: 'users', action: 'suspend' });
  const { data: canReactivate } = useCan({
    resource: 'users',
    action: 'reactivate',
  });
  const { data: canImpersonate } = useCan({
    resource: 'users',
    action: 'impersonate',
  });

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<IUser>({
    resource: 'users',
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch } = tableQueryResult;
  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = current ?? 1;
  const currentPageSize = pageSize ?? 25;
  const activeFilters = filters ?? [];

  const [search, setSearch] = React.useState('');
  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<IUser | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

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
      if (!value) return withoutKey;
      return [...withoutKey, { field: key, operator: 'eq' as const, value }];
    });
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/admin/users/${selectedUser.id}/suspend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to suspend user');

      toast.success('User suspended successfully');
      setSuspendDialogOpen(false);
      refetch();
    } catch {
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (user: IUser) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/admin/users/${user.id}/reactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to reactivate user');

      toast.success('User reactivated successfully');
      refetch();
    } catch {
      toast.error('Failed to reactivate user');
    }
  };

  const handleImpersonate = async (user: IUser) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/admin/users/${user.id}/impersonate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to start impersonation');

      const data = await response.json();
      localStorage.setItem('impersonation_token', data.token);
      localStorage.setItem('impersonation_target', JSON.stringify(user));

      toast.success(`Now viewing as ${user.email}`);
      window.location.reload();
    } catch {
      toast.error('Failed to start impersonation');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load users</p>
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
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      <DataTableToolbar
        searchPlaceholder="Search by name or email..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: 'status', label: 'Status', options: statusOptions },
          { key: 'userType', label: 'Type', options: userTypeOptions },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Try adjusting your search or filters"
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
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {(user.displayName || user.email)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.displayName || 'No name'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.userType}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.companyId ? 'Company' : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/users/${user.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          {canImpersonate?.can && user.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleImpersonate(user);
                              }}
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Impersonate
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {canSuspend?.can && user.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedUser(user);
                                setSuspendDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          )}

                          {canReactivate?.can && user.status === 'SUSPENDED' && (
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                handleReactivate(user);
                              }}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
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
              {Math.min(currentPage * currentPageSize, total)} of {total} users
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
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        title="Suspend User"
        description={`Are you sure you want to suspend ${selectedUser?.email}? They will immediately lose access to the platform.`}
        confirmLabel="Suspend"
        variant="destructive"
        onConfirm={handleSuspend}
        loading={actionLoading}
      />
    </div>
  );
}

export default UserListPage;

