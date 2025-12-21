import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@project/ui';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

const eventTypeOptions = [
  { label: 'All Events', value: 'ALL' },
  { label: '── User Events ──', value: '', disabled: true },
  { label: 'User Created', value: 'USER_CREATED' },
  { label: 'User Updated', value: 'USER_UPDATED' },
  { label: 'User Suspended', value: 'USER_SUSPENDED' },
  { label: 'User Reactivated', value: 'USER_REACTIVATED' },
  { label: 'User Deleted', value: 'USER_DELETED' },
  { label: '── Auth Events ──', value: '', disabled: true },
  { label: 'Login Success', value: 'LOGIN_SUCCESS' },
  { label: 'Login Failed', value: 'LOGIN_FAILED' },
  { label: 'Logout', value: 'LOGOUT' },
  { label: '── Password Events ──', value: '', disabled: true },
  { label: 'Password Changed', value: 'PASSWORD_CHANGED' },
  { label: 'Password Reset', value: 'PASSWORD_RESET_REQUESTED' },
  { label: 'Email Verified', value: 'EMAIL_VERIFIED' },
  { label: '── Permission Events ──', value: '', disabled: true },
  { label: 'Role Changed', value: 'ROLE_CHANGED' },
  { label: 'Impersonation Started', value: 'IMPERSONATION_STARTED' },
  { label: 'Impersonation Ended', value: 'IMPERSONATION_ENDED' },
  { label: '── Invite Events ──', value: '', disabled: true },
  { label: 'Invite Sent', value: 'INVITE_SENT' },
  { label: 'Invite Accepted', value: 'INVITE_ACCEPTED' },
  { label: 'Invite Cancelled', value: 'INVITE_CANCELLED' },
  { label: '── Company Events ──', value: '', disabled: true },
  { label: 'Company Created', value: 'COMPANY_CREATED' },
  { label: 'Company Updated', value: 'COMPANY_UPDATED' },
  { label: 'Member Added', value: 'MEMBER_ADDED' },
  { label: 'Member Removed', value: 'MEMBER_REMOVED' },
];

interface AuditLogFiltersProps {
  filters: {
    eventType: string;
    startDate: Date | null;
    endDate: Date | null;
    search: string;
  };
  onFiltersChange: (filters: AuditLogFiltersProps['filters']) => void;
  onClear: () => void;
}

export function AuditLogFilters({ filters, onFiltersChange, onClear }: AuditLogFiltersProps) {
  const hasActiveFilters =
    filters.eventType || filters.startDate || filters.endDate || filters.search;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search in event details..."
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            className="max-w-sm"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-[200px]">
          <Select
            value={filters.eventType}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                eventType: value === 'ALL' ? '' : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map((option, idx) =>
                option.disabled ? (
                  <div
                    key={`${option.label}-${idx}`}
                    className="px-2 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    {option.label}
                  </div>
                ) : (
                  <SelectItem key={option.value || idx} value={option.value}>
                    {option.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="w-[180px] justify-start text-left" asChild>
            <label className="flex w-full items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="text-sm text-muted-foreground">Start Date</span>
              <Input
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    startDate: event.target.value ? new Date(event.target.value) : null,
                  })
                }
                className="ml-2 h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </label>
          </Button>

          <Button variant="outline" className="w-[180px] justify-start text-left" asChild>
            <label className="flex w-full items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="text-sm text-muted-foreground">End Date</span>
              <Input
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    endDate: event.target.value ? new Date(event.target.value) : null,
                  })
                }
                className="ml-2 h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}

