import { cva, type VariantProps } from 'class-variance-authority';
import {
  Ban,
  CheckCircle,
  Clock,
  Trash2,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { InviteStatus, UserStatus } from '@project/contracts';
import { cn } from '../utils';

type StatusKey = UserStatus | InviteStatus | 'UNKNOWN';

/**
 * Status colors aligned with Design System semantic tokens
 * - Success: Active, Accepted
 * - Warning: Pending states
 * - Error: Suspended
 * - Muted: Deleted, Expired, Cancelled
 * - Info: Onboarding
 */
const statusConfig: Record<StatusKey, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  // Success states
  ACTIVE: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle, label: 'Active' },
  ACCEPTED: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle, label: 'Accepted' },
  
  // Warning states
  PENDING_VERIFICATION: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    icon: Clock,
    label: 'Pending Verification',
  },
  PENDING: { bg: 'bg-warning-light', text: 'text-warning', icon: Clock, label: 'Pending' },
  
  // Info states
  PENDING_ONBOARDING: {
    bg: 'bg-info-light',
    text: 'text-info',
    icon: UserPlus,
    label: 'Pending Onboarding',
  },
  
  // Error states
  SUSPENDED: { bg: 'bg-error-light', text: 'text-error', icon: Ban, label: 'Suspended' },
  
  // Muted/Inactive states
  DELETED: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Trash2, label: 'Deleted' },
  EXPIRED: { bg: 'bg-muted', text: 'text-muted-foreground', icon: XCircle, label: 'Expired' },
  CANCELLED: { bg: 'bg-muted', text: 'text-muted-foreground', icon: XCircle, label: 'Cancelled' },
  UNKNOWN: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Clock, label: 'Unknown' },
};

const statusBadgeVariants = cva('inline-flex items-center gap-1.5 rounded-full font-medium', {
  variants: {
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: UserStatus | InviteStatus;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, size, showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.UNKNOWN;
  const Icon = config.icon;

  return (
    <span className={cn(statusBadgeVariants({ size }), config.bg, config.text, className)}>
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} aria-hidden />}
      {config.label}
    </span>
  );
}
