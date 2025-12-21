import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import type {
  UserStatus,
  UserType,
  IdentityProvider,
  B2BRole,
  DeviceType,
  SessionStatus,
  SeniorityLevel,
  BackofficeRole,
  InviteType,
} from '@project/contracts/auth';

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

export const UuidSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(8).max(100);

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

// ============================================================================
// AUTH - LOGIN & SIGNUP
// ============================================================================

export const LoginSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
  deviceType: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']).default('WEB'),
  deviceName: z.string().max(100, 'Device name too long').optional(),
  deviceId: z.string().max(255, 'Device ID too long').optional(),
  rememberMe: z.boolean().default(true),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const SignupSchema = z.object({
  email: EmailSchema.max(255, 'Email too long').transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  displayName: z.string().max(100, 'Display name too long').optional(),
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
  preferredLanguage: z.string().length(2, 'Language code must be 2 characters').default('en'),
  guestId: UuidSchema.optional(),
});
export type SignupDto = z.infer<typeof SignupSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

// ============================================================================
// AUTH - PROFILE
// ============================================================================

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  preferredLanguage: z.string().length(2).optional(),
  timezone: z.string().max(50).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// ============================================================================
// SESSION
// ============================================================================

export const RevokeSessionSchema = z.object({
  sessionId: UuidSchema,
  reason: z.string().max(100).optional(),
});
export type RevokeSessionDto = z.infer<typeof RevokeSessionSchema>;

export const RevokeAllSessionsSchema = z.object({
  exceptCurrent: z.boolean().default(true),
});
export type RevokeAllSessionsDto = z.infer<typeof RevokeAllSessionsSchema>;

// ============================================================================
// GUEST
// ============================================================================

export const CreateGuestSchema = z.object({
  deviceFingerprint: z.string().max(255, 'Device fingerprint too long').optional(),
  deviceType: z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']).default('WEB'),
  appVersion: z.string().max(20, 'App version too long').optional(),
});
export type CreateGuestDto = z.infer<typeof CreateGuestSchema>;

export const MergeGuestSchema = z.object({
  guestId: UuidSchema,
});
export type MergeGuestDto = z.infer<typeof MergeGuestSchema>;

export const UpdateGuestActivitySchema = z.object({
  guestId: UuidSchema,
});
export type UpdateGuestActivityDto = z.infer<typeof UpdateGuestActivitySchema>;

// Aliases for legacy imports
export const createGuestSchema = CreateGuestSchema;
export const updateGuestActivitySchema = UpdateGuestActivitySchema;

// ============================================================================
// ONBOARDING
// ============================================================================

const singleChoiceAnswerSchema = z.object({
  selected: z.string().min(1, 'Selection required'),
});

const multipleChoiceAnswerSchema = z.object({
  selected: z.array(z.string()).min(1, 'At least one selection required'),
});

const scaleAnswerSchema = z.object({
  value: z.number().min(1).max(10),
});

const textAnswerSchema = z.object({
  text: z.string().min(1, 'Text required').max(1000, 'Text too long'),
});

const answerValueSchema = z.union([
  singleChoiceAnswerSchema,
  multipleChoiceAnswerSchema,
  scaleAnswerSchema,
  textAnswerSchema,
]);

const answerInputSchema = z.object({
  questionId: UuidSchema,
  value: answerValueSchema,
});

export const SubmitOnboardingSchema = z.object({
  answers: z.array(answerInputSchema).min(1, 'At least one answer required'),
});
export type SubmitOnboardingDto = z.infer<typeof SubmitOnboardingSchema>;

export const UpdateAnswerSchema = SubmitOnboardingSchema;
export type UpdateAnswerDto = SubmitOnboardingDto;

// Backwards compat names
export const submitAnswersSchema = SubmitOnboardingSchema;
export type SubmitAnswersDto = SubmitOnboardingDto;
export const updateAnswersSchema = UpdateAnswerSchema;
export type UpdateAnswersDto = UpdateAnswerDto;

// ============================================================================
// B2B - COMPANY & INVITES
// ============================================================================

export const CreateCompanySchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().max(500).optional(),
  seatLimit: z.number().min(1).default(10),
});
export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  seatLimit: z.number().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;

export const CreateInviteSchema = z.object({
  inviteType: z.enum(['EMAIL', 'LINK']),
  email: EmailSchema.optional(),
  maxUses: z.number().min(1).optional(),
  assignedRole: z
    .enum(['EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN'])
    .default('EMPLOYEE'),
  personalMessage: z.string().max(500).optional(),
  expiresInDays: z.number().min(1).max(30).default(7),
});
export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;

export const JoinCompanySchema = z.object({
  inviteCode: z.string().min(1).max(50),
});
export type JoinCompanyDto = z.infer<typeof JoinCompanySchema>;

export const UpdateMemberRoleSchema = z.object({
  userId: UuidSchema,
  role: z.enum(['EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN']),
});
export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;

export const RemoveMemberSchema = z.object({
  userId: UuidSchema,
});
export type RemoveMemberDto = z.infer<typeof RemoveMemberSchema>;

export const createEmailInviteSchema = z.object({
  email: EmailSchema.max(255, 'Email too long'),
  assignedRole: z
    .enum(['EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN'])
    .default('EMPLOYEE'),
  personalMessage: z.string().max(500, 'Message too long').optional(),
  expiryDays: z.number().min(1).max(30).default(7),
});
export type CreateEmailInviteDto = z.infer<typeof createEmailInviteSchema>;

export const createLinkInviteSchema = z.object({
  assignedRole: z
    .enum(['EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN'])
    .default('EMPLOYEE'),
  maxUses: z.number().min(1).max(1000).optional(),
  expiryDays: z.number().min(1).max(90).default(30),
});
export type CreateLinkInviteDto = z.infer<typeof createLinkInviteSchema>;

export const bulkInviteSchema = z.object({
  emails: z.array(EmailSchema).min(1).max(100),
  assignedRole: z
    .enum(['EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN'])
    .default('EMPLOYEE'),
  expiryDays: z.number().min(1).max(30).default(7),
});
export type BulkInviteDto = z.infer<typeof bulkInviteSchema>;

export const acceptInviteSchema = z.object({
  inviteCode: z.string().min(1).max(50),
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const inviteListQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type InviteListQueryDto = z.infer<typeof inviteListQuerySchema>;

// ============================================================================
// ADMIN - BACKOFFICE
// ============================================================================

export const CreateAdminSchema = z.object({
  email: EmailSchema,
  displayName: z.string().min(2).max(100),
  role: z.enum([
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'SUPPORT_AGENT',
    'B2B_MANAGER',
    'ANALYTICS_VIEWER',
  ]),
});
export type CreateAdminDto = z.infer<typeof CreateAdminSchema>;

export const UpdateAdminSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  role: z
    .enum([
      'SUPER_ADMIN',
      'CONTENT_MANAGER',
      'SUPPORT_AGENT',
      'B2B_MANAGER',
      'ANALYTICS_VIEWER',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export type UpdateAdminDto = z.infer<typeof UpdateAdminSchema>;

export const AdminQuerySchema = PaginationQuerySchema.extend({
  role: z
    .enum([
      'SUPER_ADMIN',
      'CONTENT_MANAGER',
      'SUPPORT_AGENT',
      'B2B_MANAGER',
      'ANALYTICS_VIEWER',
    ])
    .optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  search: z.string().max(100).optional(),
});
export type AdminQueryDto = z.infer<typeof AdminQuerySchema>;

export const ImpersonateUserSchema = z.object({
  userId: UuidSchema,
  reason: z.string().min(10).max(500),
});
export type ImpersonateUserDto = z.infer<typeof ImpersonateUserSchema>;

export const userListQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: z
    .enum(['PENDING_VERIFICATION', 'PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED', 'DELETED'])
    .optional(),
  userType: z.enum(['B2C', 'B2B']).optional(),
  companyId: UuidSchema.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;

export const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason required').max(500, 'Reason too long'),
});
export type SuspendUserDto = z.infer<typeof suspendUserSchema>;

export const auditLogQuerySchema = z.object({
  userId: UuidSchema.optional(),
  adminId: UuidSchema.optional(),
  eventType: z.string().optional(),
  success: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  startDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});
export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

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
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  session?: SessionResponse;
   // Flags
  needsOnboarding?: boolean;
  needsEmailVerification?: boolean;
  guestMerged?: boolean;
  customClaims?: {
    userType: UserType;
    subscriptionTier: string;
    companyId?: string;
    b2bRole?: B2BRole;
  };
}

export interface SessionResponse {
  id: string;
  deviceType: DeviceType;
  deviceName: string | null;
  ipAddress: string | null;
  status: SessionStatus;
  lastActivityAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface GuestResponse {
  id: string;
  deviceType: DeviceType;
  appVersion: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface PersonaResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  primaryGoal: string;
  targetSeniority: SeniorityLevel;
  iconUrl: string | null;
}

export interface OnboardingQuestionResponse {
  id: string;
  code: string;
  questionText: string;
  questionType: string;
  options: unknown;
  isRequired: boolean;
  displayOrder: number;
}

export interface OnboardingProgressResponse {
  totalQuestions: number;
  answeredQuestions: number;
  isComplete: boolean;
  persona: PersonaResponse | null;
}

export interface CompanyResponse {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  seatLimit: number;
  currentSeatCount: number;
  createdAt: string;
}

export interface CompanyMemberResponse {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  b2bRole: B2BRole;
  joinedAt: string;
}

export interface InviteResponse {
  id: string;
  inviteType: InviteType;
  inviteCode: string;
  email: string | null;
  status: string;
  assignedRole: B2BRole;
  expiresAt: string;
  createdAt: string;
}

export interface AdminResponse {
  id: string;
  email: string;
  displayName: string;
  role: BackofficeRole;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// AUDIT RESPONSE
// ============================================================================

export interface AuditLogResponse {
  id: string;
  eventType: string;
  userId: string | null;
  success: boolean;
  ipAddressHash: string | null;
  deviceType: DeviceType;
  createdAt: string;
}

// ============================================================================
// SWAGGER RESPONSE HELPERS
// ============================================================================

export class ErrorResponseDto {
  @ApiProperty({
    example: {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid or expired authentication token',
      details: { reason: 'Token expired' },
    },
  })
  error!: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  @ApiProperty({
    example: {
      timestamp: '2025-01-01T12:00:00.000Z',
      path: '/api/auth/me',
      method: 'GET',
    },
  })
  meta!: {
    timestamp: string;
    path: string;
    method: string;
  };
}

export class SuccessResponseDto {
  @ApiProperty({ example: { success: true } })
  data!: Record<string, any>;

  @ApiProperty({
    example: { timestamp: '2025-01-01T12:00:00.000Z' },
  })
  meta!: {
    timestamp: string;
  };
}

export class PaginationMetaDto {
  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  timestamp!: string;
}

// Request DTOs for Swagger
export class CreateGuestRequestDto {
  @ApiProperty({ required: false, example: 'fingerprint-123' })
  deviceFingerprint?: string;

  @ApiProperty({ enum: ['IOS', 'ANDROID', 'WEB', 'UNKNOWN'], default: 'WEB' })
  deviceType!: DeviceType;

  @ApiProperty({ required: false, example: '1.0.0' })
  appVersion?: string;
}

export class UpdateGuestActivityRequestDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  guestId!: string;
}

