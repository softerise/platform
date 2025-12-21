// ============================================================================
// Company & B2B Interfaces
// ============================================================================

import type { B2BRole } from './user.interface.js';

export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'CHURNED';

export type InviteType = 'EMAIL' | 'LINK';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface ICompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: CompanyStatus;
  seatLimit: number;
  currentSeatCount: number;
  defaultInviteCode: string;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ICompanyInvite {
  id: string;
  companyId: string;
  inviteType: InviteType;
  inviteCode: string;
  email: string | null;
  status: InviteStatus;
  maxUses: number | null;
  currentUses: number;
  assignedRole: B2BRole;
  invitedByUserId: string;
  personalMessage: string | null;
  expiresAt: Date;
  acceptedByUserId: string | null;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCompanyInvite {
  companyId: string;
  inviteType: InviteType;
  email?: string;
  maxUses?: number;
  assignedRole?: B2BRole;
  personalMessage?: string;
  expiresInDays?: number;
}

export interface IJoinCompany {
  inviteCode: string;
  userId: string;
}

