import type { AccessControlProvider } from '@refinedev/core';

type BackofficeRole =
  | 'SUPER_ADMIN'
  | 'SUPPORT_AGENT'
  | 'B2B_MANAGER'
  | 'CONTENT_MANAGER'
  | 'ANALYTICS_VIEWER';

const permissions: Record<string, BackofficeRole[]> = {
  // Books management
  'books.list': ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  'books.show': ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  'books.create': ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  'books.edit': ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  'books.delete': ['SUPER_ADMIN'],
  'books.startPipeline': ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  // Users management
  'users.list': ['SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER'],
  'users.show': ['SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER'],
  'users.suspend': ['SUPER_ADMIN'],
  'users.reactivate': ['SUPER_ADMIN'],
  'users.impersonate': ['SUPER_ADMIN', 'SUPPORT_AGENT'],
  // Audit logs
  'audit-logs.list': ['SUPER_ADMIN', 'SUPPORT_AGENT'],
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return { can: false, reason: 'Not authenticated' };
    }

    let role: BackofficeRole;
    try {
      const user = JSON.parse(userStr);
      role = user.role as BackofficeRole;
    } catch {
      return { can: false, reason: 'Invalid user data' };
    }

    if (role === 'SUPER_ADMIN') {
      return { can: true };
    }

    const permissionKey = `${resource}.${action}`;
    const allowedRoles = permissions[permissionKey];

    if (!allowedRoles) {
      return { can: false, reason: 'Permission not defined' };
    }

    const canAccess = allowedRoles.includes(role);

    if (resource === 'users' && role === 'B2B_MANAGER') {
      return {
        can: canAccess,
        reason: canAccess ? undefined : 'Access denied',
      };
    }

    return {
      can: canAccess,
      reason: canAccess ? undefined : 'Access denied',
    };
  },
};

