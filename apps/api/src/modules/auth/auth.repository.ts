import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../_core';
import type {
  AdminStatus,
  AuthEventType,
  BackofficeRole,
  B2BRole,
  DeviceType,
  InviteStatus,
  SessionStatus,
  UserStatus,
  UserType,
} from '@project/contracts/auth';

// ============================================================================
// TYPES
// ============================================================================

interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

// ============================================================================
// AUTH REPOSITORY
// ============================================================================

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // USER OPERATIONS
  // ==========================================================================

  async createUser(data: {
    email: string;
    firebaseUid?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    identityProvider?: string;
    preferredLanguage?: string;
    status?: UserStatus;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        firebaseUid: data.firebaseUid,
        displayName: data.displayName,
        firstName: data.firstName,
        lastName: data.lastName,
        identityProvider: (data.identityProvider as any) ?? 'EMAIL',
        preferredLanguage: data.preferredLanguage ?? 'en',
        status: data.status ?? 'PENDING_VERIFICATION',
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async findUserByFirebaseUid(firebaseUid: string) {
    return this.prisma.user.findUnique({
      where: { firebaseUid, deletedAt: null },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async softDeleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'DELETED' as UserStatus,
      },
    });
  }

  async findUsers(params: PaginationParams & {
    status?: UserStatus;
    userType?: UserType;
    search?: string;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, status, userType, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(userType && { userType }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  // ==========================================================================
  // SESSION OPERATIONS
  // ==========================================================================

  async createSession(data: {
    userId: string;
    deviceType: DeviceType;
    deviceName?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    firebaseTokenId: string;
    expiresAt: Date;
  }) {
    return this.prisma.userSession.create({
      data: {
        userId: data.userId,
        deviceType: data.deviceType as any,
        deviceName: data.deviceName,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        firebaseTokenId: data.firebaseTokenId,
        expiresAt: data.expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  async findSessionById(id: string) {
    return this.prisma.userSession.findUnique({
      where: { id },
    });
  }

  async findSessionsByUserId(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async updateSessionActivity(id: string) {
    return this.prisma.userSession.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  async revokeSession(id: string, reason?: string) {
    return this.prisma.userSession.update({
      where: { id },
      data: {
        status: 'REVOKED' as SessionStatus,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    return this.prisma.userSession.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: {
        status: 'REVOKED' as SessionStatus,
        revokedAt: new Date(),
        revokedReason: 'All sessions revoked',
      },
    });
  }

  async deleteExpiredSessions() {
    return this.prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { status: { in: ['EXPIRED', 'REVOKED'] } },
        ],
      },
    });
  }

  // ==========================================================================
  // GUEST OPERATIONS
  // ==========================================================================

  async createGuest(data: {
    deviceFingerprint?: string;
    deviceType: DeviceType;
    appVersion?: string;
    expiresAt: Date;
  }) {
    return this.prisma.guest.create({
      data: {
        deviceFingerprint: data.deviceFingerprint,
        deviceType: data.deviceType as any,
        appVersion: data.appVersion,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findGuestById(id: string) {
    return this.prisma.guest.findUnique({
      where: { id },
    });
  }

  async findGuestByFingerprint(fingerprint: string) {
    return this.prisma.guest.findUnique({
      where: { deviceFingerprint: fingerprint },
    });
  }

  async updateGuest(id: string, data: Prisma.GuestUpdateInput) {
    return this.prisma.guest.update({
      where: { id },
      data,
    });
  }

  async mergeGuestToUser(guestId: string, userId: string) {
    return this.prisma.guest.update({
      where: { id: guestId },
      data: {
        mergedToUserId: userId,
        mergedAt: new Date(),
      },
    });
  }

  async deleteExpiredGuests() {
    return this.prisma.guest.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        mergedToUserId: null,
      },
    });
  }

  // ==========================================================================
  // ONBOARDING OPERATIONS
  // ==========================================================================

  async findActivePersonas() {
    return this.prisma.persona.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findPersonaById(id: string) {
    return this.prisma.persona.findUnique({
      where: { id },
    });
  }

  async findPersonaByCode(code: string) {
    return this.prisma.persona.findUnique({
      where: { code },
    });
  }

  async findActiveOnboardingQuestions() {
    return this.prisma.onboardingQuestion.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOnboardingQuestionById(id: string) {
    return this.prisma.onboardingQuestion.findUnique({
      where: { id },
    });
  }

  async findUserOnboardingAnswers(userId: string) {
    return this.prisma.onboardingAnswer.findMany({
      where: { userId, isCurrent: true },
      include: { question: true },
    });
  }

  async upsertOnboardingAnswer(data: {
    userId: string;
    questionId: string;
    answerValue: unknown;
  }) {
    await this.prisma.onboardingAnswer.updateMany({
      where: {
        userId: data.userId,
        questionId: data.questionId,
        isCurrent: true,
      },
      data: { isCurrent: false },
    });

    return this.prisma.onboardingAnswer.create({
      data: {
        userId: data.userId,
        questionId: data.questionId,
        answerValue: data.answerValue as any,
        isCurrent: true,
        version: 1,
      },
    });
  }

  async updateUserPersona(userId: string, personaId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        personaId,
        onboardingCompletedAt: new Date(),
      },
    });
  }

  // ==========================================================================
  // COMPANY OPERATIONS
  // ==========================================================================

  async createCompany(data: {
    name: string;
    slug: string;
    logoUrl?: string;
    seatLimit?: number;
    defaultInviteCode: string;
  }) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        seatLimit: data.seatLimit ?? 10,
        defaultInviteCode: data.defaultInviteCode,
      },
    });
  }

  async findCompanyById(id: string) {
    return this.prisma.company.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findCompanyBySlug(slug: string) {
    return this.prisma.company.findUnique({
      where: { slug, deletedAt: null },
    });
  }

  async findCompanyByInviteCode(inviteCode: string) {
    return this.prisma.company.findUnique({
      where: { defaultInviteCode: inviteCode, deletedAt: null },
    });
  }

  async updateCompany(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async incrementCompanySeatCount(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { currentSeatCount: { increment: 1 } },
    });
  }

  async decrementCompanySeatCount(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { currentSeatCount: { decrement: 1 } },
    });
  }

  async findCompanyMembers(companyId: string, params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      companyId,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { b2bJoinedAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async addUserToCompany(userId: string, companyId: string, role: B2BRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        companyId,
        b2bRole: role as any,
        b2bJoinedAt: new Date(),
        userType: 'B2B' as UserType,
      },
    });
  }

  async removeUserFromCompany(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        companyId: null,
        b2bRole: null,
        b2bJoinedAt: null,
        userType: 'B2C' as UserType,
      },
    });
  }

  async updateUserB2BRole(userId: string, role: B2BRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { b2bRole: role as any },
    });
  }

  // ==========================================================================
  // INVITE OPERATIONS
  // ==========================================================================

  async createInvite(data: {
    companyId: string;
    inviteType: string;
    inviteCode: string;
    email?: string;
    maxUses?: number;
    assignedRole: B2BRole;
    invitedByUserId: string;
    personalMessage?: string;
    expiresAt: Date;
  }) {
    return this.prisma.companyInvite.create({
      data: {
        companyId: data.companyId,
        inviteType: data.inviteType as any,
        inviteCode: data.inviteCode,
        email: data.email,
        maxUses: data.maxUses,
        assignedRole: data.assignedRole as any,
        invitedByUserId: data.invitedByUserId,
        personalMessage: data.personalMessage,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findInviteByCode(code: string) {
    return this.prisma.companyInvite.findUnique({
      where: { inviteCode: code },
      include: { company: true },
    });
  }

  async findInviteById(id: string) {
    return this.prisma.companyInvite.findUnique({
      where: { id },
      include: { company: true },
    });
  }

  async findCompanyInvites(companyId: string, params: PaginationParams & {
    status?: InviteStatus;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyInviteWhereInput = {
      companyId,
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.companyInvite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.companyInvite.count({ where }),
    ]);

    return { data, total };
  }

  async acceptInvite(inviteId: string, userId: string) {
    return this.prisma.companyInvite.update({
      where: { id: inviteId },
      data: {
        status: 'ACCEPTED' as InviteStatus,
        acceptedByUserId: userId,
        acceptedAt: new Date(),
        currentUses: { increment: 1 },
      },
    });
  }

  async cancelInvite(inviteId: string, cancelledByUserId: string) {
    return this.prisma.companyInvite.update({
      where: { id: inviteId },
      data: {
        status: 'CANCELLED' as InviteStatus,
        cancelledAt: new Date(),
        cancelledByUserId,
      },
    });
  }

  async expireOldInvites() {
    return this.prisma.companyInvite.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' as InviteStatus },
    });
  }

  // ==========================================================================
  // ADMIN OPERATIONS
  // ==========================================================================

  async createAdmin(data: {
    firebaseUid: string;
    email: string;
    displayName: string;
    role: BackofficeRole;
    createdBy?: string;
  }) {
    return this.prisma.backofficeAdmin.create({
      data: {
        firebaseUid: data.firebaseUid,
        email: data.email,
        displayName: data.displayName,
        role: data.role as any,
        createdBy: data.createdBy,
      },
    });
  }

  async findAdminById(id: string) {
    return this.prisma.backofficeAdmin.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findAdminByEmail(email: string) {
    return this.prisma.backofficeAdmin.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async findAdminByFirebaseUid(firebaseUid: string) {
    return this.prisma.backofficeAdmin.findUnique({
      where: { firebaseUid, deletedAt: null },
    });
  }

  async updateAdmin(id: string, data: Prisma.BackofficeAdminUpdateInput) {
    return this.prisma.backofficeAdmin.update({
      where: { id },
      data,
    });
  }

  async findAdmins(params: PaginationParams & {
    role?: BackofficeRole;
    status?: AdminStatus;
    search?: string;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, role, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BackofficeAdminWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.backofficeAdmin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.backofficeAdmin.count({ where }),
    ]);

    return { data, total };
  }

  // ==========================================================================
  // AUDIT LOG OPERATIONS
  // ==========================================================================

  async createAuditLog(data: {
    eventType: AuthEventType;
    userId?: string;
    adminId?: string;
    targetUserId?: string;
    sessionId?: string;
    ipAddressHash?: string;
    userAgent?: string;
    deviceType?: DeviceType;
    success: boolean;
    failureReason?: string;
    metadata?: unknown;
  }) {
    return this.prisma.authAuditLog.create({
      data: {
        eventType: data.eventType as any,
        userId: data.userId,
        adminId: data.adminId,
        targetUserId: data.targetUserId,
        sessionId: data.sessionId,
        ipAddressHash: data.ipAddressHash,
        userAgent: data.userAgent,
        deviceType: (data.deviceType as any) ?? 'UNKNOWN',
        success: data.success,
        failureReason: data.failureReason,
        metadata: (data.metadata as any) ?? {},
      },
    });
  }

  async findAuditLogs(params: PaginationParams & {
    userId?: string;
    eventType?: AuthEventType;
    success?: boolean;
  }): Promise<PaginatedResult<any>> {
    const { page, limit, userId, eventType, success } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuthAuditLogWhereInput = {
      ...(userId && { userId }),
      ...(eventType && { eventType }),
      ...(success !== undefined && { success }),
    };

    const [data, total] = await Promise.all([
      this.prisma.authAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.authAuditLog.count({ where }),
    ]);

    return { data, total };
  }

  // ==========================================================================
  // LOCKOUT OPERATIONS
  // ==========================================================================

  async findLockoutByEmail(email: string) {
    return this.prisma.accountLockout.findUnique({
      where: { email },
    });
  }

  async upsertLockout(email: string, data: {
    failedAttempts: number;
    lastFailedAt?: Date;
    lockedUntil?: Date | null;
    lockLevel?: number;
    requiresEmailUnlock?: boolean;
    unlockToken?: string | null;
    unlockTokenExpiresAt?: Date | null;
  }) {
    return this.prisma.accountLockout.upsert({
      where: { email },
      create: {
        email,
        ...data,
      },
      update: data,
    });
  }

  async resetLockout(email: string) {
    return this.prisma.accountLockout.update({
      where: { email },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lockLevel: 0,
        requiresEmailUnlock: false,
        unlockToken: null,
        unlockTokenExpiresAt: null,
      },
    });
  }

  async deleteLockout(email: string) {
    return this.prisma.accountLockout
      .delete({
        where: { email },
      })
      .catch(() => null);
  }
}

