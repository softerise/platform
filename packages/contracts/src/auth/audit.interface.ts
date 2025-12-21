// ============================================================================
// Audit Log Interfaces
// ============================================================================

import type { DeviceType } from './session.interface.js';

export type AuthEventType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'SIGNUP_STARTED'
    | 'SIGNUP_COMPLETED'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_COMPLETE'
    | 'EMAIL_CHANGE_REQUEST'
    | 'EMAIL_CHANGE_COMPLETE'
    | 'SESSION_REVOKED'
    | 'ALL_SESSIONS_REVOKED'
    | 'B2B_JOIN'
    | 'B2B_LEAVE'
    | 'ACCOUNT_SUSPENDED'
    | 'ACCOUNT_REACTIVATED'
    | 'ACCOUNT_DELETE_REQUEST'
    | 'ACCOUNT_DELETED'
    | 'ADMIN_IMPERSONATE_START'
    | 'ADMIN_IMPERSONATE_END'
    | 'ONBOARDING_COMPLETED'
    | 'ONBOARDING_UPDATED'
    | 'GUEST_MERGE_COMPLETED';

export interface IAuditLog {
    id: string;
    eventType: AuthEventType;
    userId: string | null;
    adminId: string | null;
    targetUserId: string | null;
    sessionId: string | null;
    ipAddressHash: string | null;
    userAgent: string | null;
    deviceType: DeviceType;
    success: boolean;
    failureReason: string | null;
    metadata: unknown;
    createdAt: Date;
}

export interface ICreateAuditLog {
    eventType: AuthEventType;
    userId?: string;
    adminId?: string;
    targetUserId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: DeviceType;
    success: boolean;
    failureReason?: string;
    metadata?: unknown;
}

