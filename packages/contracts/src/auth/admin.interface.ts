// ============================================================================
// Backoffice Admin Interfaces
// ============================================================================

import type { BackofficeRole } from './user.interface.js';

export type AdminStatus = 'ACTIVE' | 'SUSPENDED';

export interface IBackofficeAdmin {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: BackofficeRole;
  status: AdminStatus;
  lastLoginAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ICreateAdmin {
  email: string;
  displayName: string;
  role: BackofficeRole;
  createdBy?: string;
}

