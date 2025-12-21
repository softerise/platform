import { z } from 'zod';

// === Enums ===
export const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PENDING_ONBOARDING: 'PENDING_ONBOARDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const UserType = {
  B2C: 'B2C',
  B2B: 'B2B',
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

export const IdentityProvider = {
  EMAIL: 'EMAIL',
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
} as const;
export type IdentityProvider =
  (typeof IdentityProvider)[keyof typeof IdentityProvider];

// === Login ===
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginSchema>;

// === Signup ===
export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});
export type SignupDto = z.infer<typeof SignupSchema>;

// === Update Profile ===
export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  preferredLanguage: z.string().length(2).optional(),
  timezone: z.string().max(50).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// === Response Types ===
export interface UserResponse {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  userType: UserType;
  status: UserStatus;
  identityProvider: IdentityProvider;
  preferredLanguage: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken?: string;
}

