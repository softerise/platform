// ============================================================================
// Session Interfaces
// ============================================================================

export type DeviceType = 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface ISession {
  id: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string | null;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firebaseTokenId: string;
  status: SessionStatus;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateSession {
  userId: string;
  deviceType: DeviceType;
  deviceName?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  firebaseTokenId: string;
  expiresAt: Date;
}

