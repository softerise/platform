import * as React from 'react';
import { useShow, useCan } from '@refinedev/core';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  RoleBadge,
  LoadingSkeleton,
  ConfirmDialog,
  toast,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Separator,
} from '@project/ui';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Globe,
  Shield,
  Building,
  UserCog,
  Ban,
  UserCheck,
} from 'lucide-react';
import type { IUser } from '@project/contracts';

export function UserShowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = id ?? '';

  const { data: canSuspend } = useCan({ resource: 'users', action: 'suspend' });
  const { data: canReactivate } = useCan({
    resource: 'users',
    action: 'reactivate',
  });
  const { data: canImpersonate } = useCan({
    resource: 'users',
    action: 'impersonate',
  });

  const { queryResult } = useShow<IUser>({
    resource: 'users',
    id: userId,
    queryOptions: { enabled: !!userId, queryKey: ['users', userId] },
  });

  const { data, isLoading, isError, refetch } = queryResult;
  const user = data?.data;

  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleSuspend = async () => {
    if (!user) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/admin/users/${user.id}/suspend`,
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

  const handleReactivate = async () => {
    if (!user) return;

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

  const handleImpersonate = async () => {
    if (!user) return;

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
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <LoadingSkeleton variant="card" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load user</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/users')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Users
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {(user.displayName || user.email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold">
                  {user.displayName || 'No name'}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={user.status} />
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm">{user.userType}</span>
                  {user.b2bRole && (
                    <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <RoleBadge role={user.b2bRole} size="sm" />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canImpersonate?.can && user.status === 'ACTIVE' && (
                <Button variant="outline" onClick={handleImpersonate}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Impersonate
                </Button>
              )}
              {canSuspend?.can && user.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  onClick={() => setSuspendDialogOpen(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend
                </Button>
              )}
              {canReactivate?.can && user.status === 'SUSPENDED' && (
                <Button variant="default" onClick={handleReactivate}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivate
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow
              icon={Globe}
              label="Language"
              value={user.preferredLanguage || 'Not set'}
            />
            <InfoRow
              icon={Globe}
              label="Timezone"
              value={user.timezone || 'Not set'}
            />
            <InfoRow
              icon={Shield}
              label="Identity Provider"
              value={user.identityProvider}
            />
            <InfoRow
              icon={Mail}
              label="Email verification"
              value={user.email}
              verified={!!user.emailVerifiedAt}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Calendar}
              label="Created"
              value={new Date(user.createdAt).toLocaleString()}
            />
            <InfoRow
              icon={Calendar}
              label="Last Login"
              value={
                user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : 'Never'
              }
            />
            {user.userType === 'B2B' && (
              <>
                <Separator />
                <InfoRow
                  icon={Building}
                  label="Company"
                  value={user.companyId || 'Not assigned'}
                />
                <InfoRow
                  icon={Shield}
                  label="B2B Role"
                  value={user.b2bRole || 'Not assigned'}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        title="Suspend User"
        description={`Are you sure you want to suspend ${user.email}? They will immediately lose access to the platform.`}
        confirmLabel="Suspend"
        variant="destructive"
        onConfirm={handleSuspend}
        loading={actionLoading}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  verified,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">
          {value}
          {verified !== undefined && (
            <span
              className={`ml-2 text-xs ${
                verified ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              {verified ? 'Verified' : 'Not verified'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default UserShowPage;

