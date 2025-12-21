import type { IResourceItem } from '@refinedev/core';

export const resources: IResourceItem[] = [
  {
    name: 'dashboard',
    list: '/admin',
    meta: { label: 'Dashboard' },
  },
  {
    name: 'books',
    list: '/admin/books',
    create: '/admin/books/create',
    show: '/admin/books/:id',
    edit: '/admin/books/:id/edit',
    meta: { label: 'Books' },
  },
  {
    name: 'pipelines',
    list: '/admin/pipelines',
    show: '/admin/pipelines/:id',
    meta: { label: 'Pipelines' },
  },
  {
    name: 'courses',
    list: '/admin/courses',
    show: '/admin/courses/:id',
    meta: { label: 'Courses' },
  },
  {
    name: 'users',
    list: '/admin/users',
    show: '/admin/users/:id',
    meta: { label: 'Users' },
  },
  {
    name: 'audit-logs',
    list: '/admin/audit-logs',
    meta: { label: 'Audit Logs' },
  },
];

