import * as React from 'react';
import {
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  LogIn,
  LogOut,
  KeyRound,
  Mail,
  Shield,
  Eye,
  Send,
  Check,
  X,
  Building,
  Users,
} from 'lucide-react';

type AuditEventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'USER_DELETED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'EMAIL_VERIFIED'
  | 'ROLE_CHANGED'
  | 'IMPERSONATION_STARTED'
  | 'IMPERSONATION_ENDED'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'INVITE_CANCELLED'
  | 'COMPANY_CREATED'
  | 'COMPANY_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';

interface EventConfig {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
}

const eventConfig: Record<AuditEventType, EventConfig> = {
  USER_CREATED: {
    label: 'User Created',
    icon: UserPlus,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  USER_UPDATED: {
    label: 'User Updated',
    icon: UserCheck,
    variant: 'secondary',
    color: 'bg-blue-100 text-blue-700',
  },
  USER_SUSPENDED: {
    label: 'User Suspended',
    icon: UserX,
    variant: 'destructive',
    color: 'bg-red-100 text-red-700',
  },
  USER_REACTIVATED: {
    label: 'User Reactivated',
    icon: UserCheck,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  USER_DELETED: {
    label: 'User Deleted',
    icon: UserMinus,
    variant: 'destructive',
    color: 'bg-red-100 text-red-700',
  },
  LOGIN_SUCCESS: {
    label: 'Login',
    icon: LogIn,
    variant: 'outline',
    color: 'bg-slate-100 text-slate-700',
  },
  LOGIN_FAILED: {
    label: 'Login Failed',
    icon: LogIn,
    variant: 'destructive',
    color: 'bg-red-100 text-red-700',
  },
  LOGOUT: {
    label: 'Logout',
    icon: LogOut,
    variant: 'outline',
    color: 'bg-slate-100 text-slate-700',
  },
  PASSWORD_CHANGED: {
    label: 'Password Changed',
    icon: KeyRound,
    variant: 'secondary',
    color: 'bg-amber-100 text-amber-700',
  },
  PASSWORD_RESET_REQUESTED: {
    label: 'Password Reset',
    icon: KeyRound,
    variant: 'secondary',
    color: 'bg-amber-100 text-amber-700',
  },
  EMAIL_VERIFIED: {
    label: 'Email Verified',
    icon: Mail,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  ROLE_CHANGED: {
    label: 'Role Changed',
    icon: Shield,
    variant: 'secondary',
    color: 'bg-purple-100 text-purple-700',
  },
  IMPERSONATION_STARTED: {
    label: 'Impersonation Started',
    icon: Eye,
    variant: 'secondary',
    color: 'bg-amber-100 text-amber-700',
  },
  IMPERSONATION_ENDED: {
    label: 'Impersonation Ended',
    icon: Eye,
    variant: 'outline',
    color: 'bg-slate-100 text-slate-700',
  },
  INVITE_SENT: {
    label: 'Invite Sent',
    icon: Send,
    variant: 'default',
    color: 'bg-blue-100 text-blue-700',
  },
  INVITE_ACCEPTED: {
    label: 'Invite Accepted',
    icon: Check,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  INVITE_CANCELLED: {
    label: 'Invite Cancelled',
    icon: X,
    variant: 'outline',
    color: 'bg-slate-100 text-slate-700',
  },
  COMPANY_CREATED: {
    label: 'Company Created',
    icon: Building,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  COMPANY_UPDATED: {
    label: 'Company Updated',
    icon: Building,
    variant: 'secondary',
    color: 'bg-blue-100 text-blue-700',
  },
  MEMBER_ADDED: {
    label: 'Member Added',
    icon: Users,
    variant: 'default',
    color: 'bg-green-100 text-green-700',
  },
  MEMBER_REMOVED: {
    label: 'Member Removed',
    icon: Users,
    variant: 'destructive',
    color: 'bg-red-100 text-red-700',
  },
};

interface EventTypeBadgeProps {
  eventType: string;
  size?: 'sm' | 'default';
}

export function EventTypeBadge({ eventType, size = 'default' }: EventTypeBadgeProps) {
  const config =
    eventConfig[eventType as AuditEventType] || {
      label: eventType.replace(/_/g, ' '),
      icon: Shield,
      variant: 'outline' as const,
      color: 'bg-slate-100 text-slate-700',
    };

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </span>
  );
}

