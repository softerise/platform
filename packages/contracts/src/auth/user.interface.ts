// ============================================================================
// User & Authentication Interfaces
// ============================================================================

export type IdentityProvider = 'EMAIL' | 'GOOGLE' | 'APPLE';

export type UserType = 'B2C' | 'B2B';

export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'PENDING_ONBOARDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DELETED';

export type B2BRole = 'EMPLOYEE' | 'TEAM_LEAD' | 'HR_MANAGER' | 'COMPANY_ADMIN';

export type BackofficeRole =
  | 'SUPER_ADMIN'
  | 'CONTENT_MANAGER'
  | 'SUPPORT_AGENT'
  | 'B2B_MANAGER'
  | 'ANALYTICS_VIEWER';

export interface IUser {
  id: string;
  email: string;
  firebaseUid: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  identityProvider: IdentityProvider;
  userType: UserType;
  status: UserStatus;
  role: string;
  companyId: string | null;
  b2bRole: B2BRole | null;
  preferredLanguage: string;
  timezone: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IAuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  role?: string;
  userType?: UserType;
  companyId?: string;
  b2bRole?: B2BRole;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: string;
  userType: UserType;
  iat: number;
  exp: number;
}

