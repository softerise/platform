// ============================================================================
// Guest Interfaces
// ============================================================================

import type { DeviceType } from './session.interface.js';

export interface IGuest {
  id: string;
  deviceFingerprint: string | null;
  deviceType: DeviceType;
  appVersion: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  mergedToUserId: string | null;
  mergedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateGuest {
  deviceFingerprint?: string;
  deviceType: DeviceType;
  appVersion?: string;
  expiresAt: Date;
}

export interface IMergeGuestToUser {
  guestId: string;
  userId: string;
}

