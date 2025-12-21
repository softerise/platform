import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCan } from '@refinedev/core';
import { cn } from '@project/ui';
import { Users, FileText, BookOpen, GitBranch, GraduationCap, LayoutDashboard } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  resource: string;
  action: string;
  exact?: boolean;
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    resource: 'dashboard',
    action: 'list',
    exact: true,
  },
  {
    label: 'Books',
    href: '/admin/books',
    icon: BookOpen,
    resource: 'books',
    action: 'list',
  },
  {
    label: 'Pipelines',
    href: '/admin/pipelines',
    icon: GitBranch,
    resource: 'pipelines',
    action: 'list',
  },
  {
    label: 'Courses',
    href: '/admin/courses',
    icon: GraduationCap,
    resource: 'courses',
    action: 'list',
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    resource: 'users',
    action: 'list',
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
    resource: 'audit-logs',
    action: 'list',
  },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation();

  return (
    <nav className="space-y-1 px-2">
      {navItems.map((item) => (
        <NavItemWithPermission
          key={item.href}
          item={item}
          isActive={
            item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href)
          }
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function TopNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {navItems.map((item) => (
        <TopNavItemWithPermission
          key={item.href}
          item={item}
          isActive={
            item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href)
          }
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function NavItemWithPermission({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const { data: canAccess } = useCan({
    resource: item.resource,
    action: item.action,
  });

  if (canAccess?.can === false) {
    return null;
  }

  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

function TopNavItemWithPermission({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const { data: canAccess } = useCan({
    resource: item.resource,
    action: item.action,
  });

  if (canAccess?.can === false) {
    return null;
  }

  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

