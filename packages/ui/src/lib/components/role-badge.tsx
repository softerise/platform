import { cva, type VariantProps } from 'class-variance-authority';
import type { B2BRole, BackofficeRole } from '@project/contracts';
import { cn } from '../utils';

type RoleKey = B2BRole | BackofficeRole | 'UNKNOWN';

/**
 * Role colors - Kategorik ayrım için
 * - Purple: Admin roles
 * - Blue/Info: Support/HR roles  
 * - Green/Success: Lead/Content roles
 * - Muted: Standard/Viewer roles
 * - Red/Error: Super Admin (dikkat çekmesi için)
 */
const roleConfig: Record<RoleKey, { bg: string; text: string; label: string }> = {
  // B2B Roles
  COMPANY_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' },
  HR_MANAGER: { bg: 'bg-info-light', text: 'text-info', label: 'HR Manager' },
  TEAM_LEAD: { bg: 'bg-success-light', text: 'text-success', label: 'Team Lead' },
  EMPLOYEE: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Employee' },
  
  // Backoffice Roles
  SUPER_ADMIN: { bg: 'bg-error-light', text: 'text-error', label: 'Super Admin' },
  SUPPORT_AGENT: { bg: 'bg-info-light', text: 'text-info', label: 'Support' },
  B2B_MANAGER: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'B2B Manager' },
  CONTENT_MANAGER: { bg: 'bg-success-light', text: 'text-success', label: 'Content' },
  ANALYTICS_VIEWER: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Analytics' },
  
  // Fallback
  UNKNOWN: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Unknown' },
};

const roleBadgeVariants = cva('inline-flex items-center rounded-full font-medium', {
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

export interface RoleBadgeProps extends VariantProps<typeof roleBadgeVariants> {
  role: B2BRole | BackofficeRole;
  className?: string;
}

export function RoleBadge({ role, size, className }: RoleBadgeProps) {
  const config = roleConfig[role] ?? roleConfig.UNKNOWN;
  
  return (
    <span className={cn(roleBadgeVariants({ size }), config.bg, config.text, className)}>
      {config.label}
    </span>
  );
}
