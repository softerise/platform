import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'crypto';
import { AuthRepository } from './auth.repository';
import type {
  AdminQueryDto,
  AdminResponse,
  AuthResponse,
  CompanyMemberResponse,
  CompanyResponse,
  CreateAdminDto,
  CreateCompanyDto,
  CreateGuestDto,
  CreateInviteDto,
  GuestResponse,
  InviteResponse,
  JoinCompanyDto,
  LoginDto,
  OnboardingProgressResponse,
  OnboardingQuestionResponse,
  PaginatedResponse,
  PaginationQueryDto,
  PersonaResponse,
  SessionResponse,
  SignupDto,
  SubmitOnboardingDto,
  UpdateAdminDto,
  UpdateCompanyDto,
  UpdateMemberRoleDto,
  UpdateProfileDto,
  UserResponse,
} from './auth.dto';
import {
  AdminCreatedEvent,
  CompanyCreatedEvent,
  GuestCreatedEvent,
  GuestMergedEvent,
  InviteAcceptedEvent,
  InviteCreatedEvent,
  OnboardingCompletedEvent,
  SessionRevokedEvent,
  UserCreatedEvent,
  UserJoinedCompanyEvent,
  UserLeftCompanyEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
} from './auth.events';
import type {
  AuthEventType,
  B2BRole,
  DeviceType,
  UserStatus,
  UserType,
  InviteStatus,
} from '@project/contracts/auth';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repository: AuthRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================================================
  // AUTH
  // ==========================================================================

  async signup(dto: SignupDto & { guestId?: string }): Promise<AuthResponse> {
    const existing = await this.repository.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.repository.createUser({
      email: dto.email,
      displayName: dto.displayName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      preferredLanguage: dto.preferredLanguage,
      status: 'PENDING_VERIFICATION',
    });

    if (dto.guestId) {
      try {
        await this.repository.mergeGuestToUser(dto.guestId, user.id);
        await this.repository.updateUser(user.id, {
          mergedFromGuest: { connect: { id: dto.guestId } },
        });
      } catch (error) {
        this.logger.warn(`Guest merge failed for ${dto.guestId}: ${error}`);
      }
    }

    await this.logAuditEvent('SIGNUP_COMPLETED', {
      userId: user.id,
      success: true,
    });

    this.eventEmitter.emit('user.created', new UserCreatedEvent({ id: user.id, email: user.email }));

    return {
      user: this.mapUserToResponse(user),
      accessToken: '', // TODO: Generate with Firebase
      expiresIn: 3600,
      refreshToken: undefined,
      session: undefined,
      customClaims: { userType: user.userType ?? 'B2C', subscriptionTier: 'free' },
      needsOnboarding: true,
      needsEmailVerification: true,
      guestMerged: !!dto.guestId,
    };
  }

  async login(
    dto: LoginDto & { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    // Placeholder: treat idToken as firebaseUid
    const user =
      (await this.repository.findUserByFirebaseUid(dto.idToken)) ??
      (await this.repository.findUserByEmail(dto.idToken));

    if (!user) {
      await this.recordFailedLogin(dto.idToken, dto.ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Account suspended');
    }

    if (user.status === 'DELETED') {
      throw new NotFoundException('Account not found');
    }

    const session = await this.repository.createSession({
      userId: user.id,
      deviceType: (dto.deviceType as DeviceType) ?? 'UNKNOWN',
      deviceName: dto.deviceName,
      deviceId: dto.deviceId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      firebaseTokenId: dto.idToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.repository.updateUser(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: dto.ipAddress,
    });

    await this.repository.deleteLockout(dto.idToken);

    await this.logAuditEvent('LOGIN_SUCCESS', {
      userId: user.id,
      sessionId: session.id,
      success: true,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      deviceType: dto.deviceType,
    });

    this.eventEmitter.emit(
      'user.logged_in',
      new UserLoggedInEvent({ userId: user.id, sessionId: session.id }),
    );

    const mappedSession = this.mapSessionToResponse(session);

    return {
      user: this.mapUserToResponse(user),
      session: mappedSession,
      customClaims: {
        userType: user.userType ?? 'B2C',
        subscriptionTier: 'free',
        companyId: user.companyId ?? undefined,
        b2bRole: user.b2bRole ?? undefined,
      },
      accessToken: '', // TODO: Firebase token
      refreshToken: undefined,
      expiresIn: 3600,
      needsOnboarding: !user.onboardingCompletedAt,
      needsEmailVerification: !user.emailVerifiedAt,
    };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId, 'User logout');
    await this.logAuditEvent('LOGOUT', { userId, sessionId, success: true });
    this.eventEmitter.emit(
      'user.logged_out',
      new UserLoggedOutEvent({ userId, sessionId }),
    );
  }

  async logoutAll(userId: string, exceptSessionId?: string): Promise<{ revokedCount: number }> {
    const result = await this.repository.revokeAllUserSessions(userId, exceptSessionId);
    await this.logAuditEvent('ALL_SESSIONS_REVOKED', { userId, success: true });
    return { revokedCount: result.count };
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.repository.updateUser(userId, {
      displayName: dto.displayName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: dto.avatarUrl,
      preferredLanguage: dto.preferredLanguage,
      timezone: dto.timezone,
    });
    return this.mapUserToResponse(updated);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.repository.revokeAllUserSessions(userId);
    await this.repository.softDeleteUser(userId);
    await this.logAuditEvent('ACCOUNT_DELETED', { userId, success: true });
  }

  async refreshClaims(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      userType: user.userType ?? 'B2C',
      subscriptionTier: 'free',
      companyId: user.companyId ?? undefined,
      b2bRole: user.b2bRole ?? undefined,
    };
  }

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  async getActiveSessions(userId: string, currentSessionId?: string): Promise<SessionResponse[]> {
    const sessions = await this.repository.findSessionsByUserId(userId);
    return sessions.map((s) => this.mapSessionToResponse(s, currentSessionId));
  }

  async revokeSession(sessionId: string, userId: string, reason?: string): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    await this.repository.revokeSession(sessionId, reason);
    await this.logAuditEvent('SESSION_REVOKED', { userId, sessionId, success: true });
    this.eventEmitter.emit(
      'session.revoked',
      new SessionRevokedEvent({ userId, sessionId }),
    );
  }

  // ==========================================================================
  // GUEST
  // ==========================================================================

  async createOrGetGuest(dto: CreateGuestDto): Promise<GuestResponse> {
    if (dto.deviceFingerprint) {
      const existing = await this.repository.findGuestByFingerprint(dto.deviceFingerprint);
      if (existing && !existing.mergedToUserId && existing.expiresAt > new Date()) {
        const updated = await this.repository.updateGuest(existing.id, {
          lastSeenAt: new Date(),
          appVersion: dto.appVersion,
        });
        return this.mapGuestToResponse(updated);
      }
    }

    const guest = await this.repository.createGuest({
      deviceFingerprint: dto.deviceFingerprint,
      deviceType: dto.deviceType as DeviceType,
      appVersion: dto.appVersion,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    this.eventEmitter.emit(
      'guest.created',
      new GuestCreatedEvent({ id: guest.id, deviceType: guest.deviceType }),
    );

    return this.mapGuestToResponse(guest);
  }

  async updateGuestActivity(guestId: string): Promise<void> {
    const guest = await this.repository.findGuestById(guestId);
    if (!guest) throw new NotFoundException('Guest not found');
    await this.repository.updateGuest(guestId, { lastSeenAt: new Date() });
  }

  async getGuest(guestId: string): Promise<GuestResponse> {
    const guest = await this.repository.findGuestById(guestId);
    if (!guest) throw new NotFoundException('Guest not found');
    return this.mapGuestToResponse(guest);
  }

  async mergeGuestToUser(userId: string, guestId: string): Promise<void> {
    const guest = await this.repository.findGuestById(guestId);
    if (!guest) throw new NotFoundException('Guest not found');
    if (guest.mergedToUserId) throw new ConflictException('Guest already merged');

    await this.repository.mergeGuestToUser(guestId, userId);
    await this.repository.updateUser(userId, { mergedFromGuest: { connect: { id: guestId } } });

    await this.logAuditEvent('GUEST_MERGE_COMPLETED', {
      userId,
      success: true,
      metadata: { guestId },
    });

    this.eventEmitter.emit(
      'guest.merged',
      new GuestMergedEvent({ guestId, userId }),
    );
  }

  // ==========================================================================
  // ONBOARDING
  // ==========================================================================

  async getQuestions(): Promise<OnboardingQuestionResponse[]> {
    return this.getOnboardingQuestions();
  }

  async getOnboardingQuestions(): Promise<OnboardingQuestionResponse[]> {
    const questions = await this.repository.findActiveOnboardingQuestions();
    return questions.map((q) => ({
      id: q.id,
      code: q.code,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      isRequired: q.isRequired,
      displayOrder: q.displayOrder,
    }));
  }

  async submitAnswers(userId: string, answers: SubmitOnboardingDto['answers']) {
    return this.submitOnboarding(userId, { answers });
  }

  async submitOnboarding(
    userId: string,
    dto: SubmitOnboardingDto,
  ): Promise<{
    userId: string;
    personaId: string | null;
    personaCode?: string | null;
    personaName?: string | null;
    completedAt: Date;
  }> {
    for (const answer of dto.answers) {
      await this.repository.upsertOnboardingAnswer({
        userId,
        questionId: answer.questionId,
        answerValue: (answer as any).answerValue ?? (answer as any).value,
      });
    }

    const personas = await this.repository.findActivePersonas();
    const persona = personas[0] ?? null;
    if (persona) {
      await this.repository.updateUserPersona(userId, persona.id);
      await this.logAuditEvent('ONBOARDING_COMPLETED', {
        userId,
        success: true,
        metadata: { personaId: persona.id },
      });
      this.eventEmitter.emit(
        'onboarding.completed',
        new OnboardingCompletedEvent({ userId, personaId: persona.id }),
      );
    }

    return {
      userId,
      personaId: persona?.id ?? null,
      personaCode: persona?.code ?? null,
      personaName: persona?.name ?? null,
      completedAt: new Date(),
    };
  }

  async updateAnswers(userId: string, answers: SubmitOnboardingDto['answers']) {
    return this.submitOnboarding(userId, { answers });
  }

  async getPersonas(): Promise<PersonaResponse[]> {
    const personas = await this.repository.findActivePersonas();
    return personas.map((p) => this.mapPersonaToResponse(p));
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingProgressResponse> {
    const [questions, answers, user] = await Promise.all([
      this.repository.findActiveOnboardingQuestions(),
      this.repository.findUserOnboardingAnswers(userId),
      this.repository.findUserById(userId),
    ]);

    let persona: PersonaResponse | null = null;
    if (user?.personaId) {
      const p = await this.repository.findPersonaById(user.personaId);
      if (p) persona = this.mapPersonaToResponse(p);
    }

    return {
      totalQuestions: questions.length,
      answeredQuestions: answers.length,
      isComplete: !!user?.onboardingCompletedAt,
      persona,
    };
  }

  // ==========================================================================
  // B2B
  // ==========================================================================

  async getInviteByCode(code: string) {
    return this.repository.findInviteByCode(code);
  }

  async acceptInvite(userId: string, inviteCode: string) {
    return this.joinCompany(userId, { inviteCode });
  }

  async getCompanyInfo(companyId: string) {
    return this.getCompany(companyId);
  }

  async leaveCompany(userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user?.companyId) throw new BadRequestException('User is not in a company');

    await this.repository.removeUserFromCompany(userId);
    await this.repository.decrementCompanySeatCount(user.companyId);

    await this.logAuditEvent('B2B_LEAVE', {
      userId,
      success: true,
      metadata: { companyId: user.companyId },
    });

    this.eventEmitter.emit(
      'user.left_company',
      new UserLeftCompanyEvent({ userId, companyId: user.companyId }),
    );
  }

  async listMembers(
    companyId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<CompanyMemberResponse>> {
    const result = await this.repository.findCompanyMembers(companyId, query);
    return {
      data: result.data.map((m) => this.mapCompanyMemberToResponse(m)),
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  async createCompany(userId: string, dto: CreateCompanyDto): Promise<CompanyResponse> {
    const existing = await this.repository.findCompanyBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('Company slug already exists');
    }

    const inviteCode = this.generateInviteCode();
    const company = await this.repository.createCompany({
      name: dto.name,
      slug: dto.slug,
      logoUrl: dto.logoUrl,
      seatLimit: dto.seatLimit,
      defaultInviteCode: inviteCode,
    });

    await this.repository.addUserToCompany(userId, company.id, 'COMPANY_ADMIN');
    await this.repository.incrementCompanySeatCount(company.id);

    this.eventEmitter.emit(
      'company.created',
      new CompanyCreatedEvent({ id: company.id, name: company.name, createdByUserId: userId }),
    );

    return this.mapCompanyToResponse(company);
  }

  async getCompany(companyId: string): Promise<CompanyResponse> {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) throw new NotFoundException('Company not found');
    return this.mapCompanyToResponse(company);
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto): Promise<CompanyResponse> {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) throw new NotFoundException('Company not found');
    const updated = await this.repository.updateCompany(companyId, {
      name: dto.name,
      logoUrl: dto.logoUrl,
      seatLimit: dto.seatLimit,
      settings: dto.settings as any,
    });
    return this.mapCompanyToResponse(updated);
  }

  async joinCompany(userId: string, dto: JoinCompanyDto): Promise<CompanyResponse> {
    const invite = await this.repository.findInviteByCode(dto.inviteCode);
    if (invite) {
      if (invite.status !== 'PENDING') throw new ConflictException('Invite is no longer valid');
      if (invite.expiresAt < new Date()) throw new ConflictException('Invite has expired');
      if (invite.maxUses && invite.currentUses >= invite.maxUses) {
        throw new ConflictException('Invite usage limit reached');
      }

      const company = invite.company;
      if (company.currentSeatCount >= company.seatLimit) {
        throw new ConflictException('Company seat limit reached');
      }

      await this.repository.acceptInvite(invite.id, userId);
      await this.repository.addUserToCompany(userId, company.id, invite.assignedRole as B2BRole);
      await this.repository.incrementCompanySeatCount(company.id);

      await this.logAuditEvent('B2B_JOIN', {
        userId,
        success: true,
        metadata: { companyId: company.id, inviteId: invite.id },
      });

      this.eventEmitter.emit(
        'invite.accepted',
        new InviteAcceptedEvent({ inviteId: invite.id, userId, companyId: company.id }),
      );

      this.eventEmitter.emit(
        'user.joined_company',
        new UserJoinedCompanyEvent({
          userId,
          companyId: company.id,
          role: invite.assignedRole,
        }),
      );

      return this.mapCompanyToResponse(company);
    }

    const company = await this.repository.findCompanyByInviteCode(dto.inviteCode);
    if (!company) throw new NotFoundException('Invalid invite code');
    if (company.currentSeatCount >= company.seatLimit) {
      throw new ConflictException('Company seat limit reached');
    }

    await this.repository.addUserToCompany(userId, company.id, 'EMPLOYEE');
    await this.repository.incrementCompanySeatCount(company.id);

    this.eventEmitter.emit(
      'user.joined_company',
      new UserJoinedCompanyEvent({ userId, companyId: company.id, role: 'EMPLOYEE' }),
    );

    return this.mapCompanyToResponse(company);
  }

  async createEmailInvite(
    userId: string,
    companyId: string,
    payload: { inviteType: string; email?: string; assignedRole: B2BRole; expiryDays: number; personalMessage?: string },
  ): Promise<InviteResponse> {
    return this.createInvite(companyId, userId, {
      inviteType: payload.inviteType as 'EMAIL' | 'LINK',
      email: payload.email,
      assignedRole: payload.assignedRole,
      expiresInDays: payload.expiryDays,
      personalMessage: payload.personalMessage,
    });
  }

  async createLinkInvite(
    userId: string,
    companyId: string,
    payload: { inviteType: string; assignedRole: B2BRole; maxUses?: number; expiryDays: number },
  ): Promise<InviteResponse> {
    return this.createInvite(companyId, userId, {
      inviteType: payload.inviteType as 'EMAIL' | 'LINK',
      assignedRole: payload.assignedRole,
      maxUses: payload.maxUses,
      expiresInDays: payload.expiryDays,
    });
  }

  async bulkCreateInvites(
    userId: string,
    companyId: string,
    emails: string[],
    assignedRole: B2BRole,
    expiryDays: number,
  ) {
    const invites: InviteResponse[] = [];
    for (const email of emails) {
      const invite = await this.createInvite(companyId, userId, {
        inviteType: 'EMAIL',
        email,
        assignedRole,
        expiresInDays: expiryDays,
      });
      invites.push(invite);
    }
    return { invites, count: invites.length };
  }

  async listInvites(
    companyId: string,
    query: PaginationQueryDto & { status?: InviteStatus },
  ): Promise<PaginatedResponse<InviteResponse>> {
    const result = await this.repository.findCompanyInvites(companyId, query);
    return {
      data: result.data.map((i) => this.mapInviteToResponse(i)),
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  async cancelInvite(companyId: string, inviteId: string, userId: string): Promise<void> {
    const invite =
      (await this.repository.findInviteById(inviteId)) ??
      (await this.repository.findInviteByCode(inviteId));
    if (!invite || invite.companyId !== companyId) {
      throw new NotFoundException('Invite not found');
    }
    await this.repository.cancelInvite(invite.id, userId);
  }

  async removeMember(companyId: string, userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user || user.companyId !== companyId) {
      throw new NotFoundException('Member not found in company');
    }
    await this.repository.removeUserFromCompany(userId);
    await this.repository.decrementCompanySeatCount(companyId);
    this.eventEmitter.emit(
      'user.left_company',
      new UserLeftCompanyEvent({ userId, companyId }),
    );
  }

  async updateMemberRole(companyId: string, dto: UpdateMemberRoleDto): Promise<void> {
    const user = await this.repository.findUserById(dto.userId);
    if (!user || user.companyId !== companyId) {
      throw new NotFoundException('Member not found in company');
    }
    await this.repository.updateUserB2BRole(dto.userId, dto.role as B2BRole);
  }

  async createInvite(companyId: string, userId: string, dto: CreateInviteDto): Promise<InviteResponse> {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const inviteCode = this.generateInviteCode();
    const expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);

    const invite = await this.repository.createInvite({
      companyId,
      inviteType: dto.inviteType,
      inviteCode,
      email: dto.email,
      maxUses: dto.maxUses,
      assignedRole: dto.assignedRole as B2BRole,
      invitedByUserId: userId,
      personalMessage: dto.personalMessage,
      expiresAt,
    });

    this.eventEmitter.emit(
      'invite.created',
      new InviteCreatedEvent({
        inviteId: invite.id,
        companyId,
        inviteType: dto.inviteType,
        email: dto.email,
      }),
    );

    return this.mapInviteToResponse(invite);
  }

  async getCompanyInvites(companyId: string, query: PaginationQueryDto) {
    return this.listInvites(companyId, query);
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  async createAdmin(dto: CreateAdminDto, createdBy?: string): Promise<AdminResponse> {
    const existing = await this.repository.findAdminByEmail(dto.email);
    if (existing) throw new ConflictException('Admin with this email already exists');

    const firebaseUid = `admin-${Date.now()}`; // TODO: Create Firebase admin user

    const admin = await this.repository.createAdmin({
      firebaseUid,
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role as any,
      createdBy,
    });

    this.eventEmitter.emit(
      'admin.created',
      new AdminCreatedEvent({ id: admin.id, email: admin.email, role: admin.role }),
    );

    return this.mapAdminToResponse(admin);
  }

  async getAdmin(adminId: string): Promise<AdminResponse> {
    const admin = await this.repository.findAdminById(adminId);
    if (!admin) throw new NotFoundException('Admin not found');
    return this.mapAdminToResponse(admin);
  }

  async updateAdmin(adminId: string, dto: UpdateAdminDto): Promise<AdminResponse> {
    const admin = await this.repository.findAdminById(adminId);
    if (!admin) throw new NotFoundException('Admin not found');
    const updated = await this.repository.updateAdmin(adminId, dto);
    return this.mapAdminToResponse(updated);
  }

  async listAdmins(query: AdminQueryDto): Promise<PaginatedResponse<AdminResponse>> {
    const result = await this.repository.findAdmins(query);
    return {
      data: result.data.map((a) => this.mapAdminToResponse(a)),
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      },
    };
  }

  async listUsers(
    filters: {
      search?: string;
      status?: UserStatus;
      userType?: UserType;
      companyId?: string;
    },
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<UserResponse>> {
    const result = await this.repository.findUsers({
      ...pagination,
      search: filters.search,
      status: filters.status,
      userType: filters.userType,
    });

    return {
      data: result.data.map((u) => this.mapUserToResponse(u)),
      meta: {
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  async listAuditLogsPlaceholder(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    return {
      data: [],
      meta: {
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
      },
    };
  }

  async getUserDetail(userId: string): Promise<UserResponse> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.mapUserToResponse(user);
  }

  async suspendUser(adminId: string, targetUserId: string, dto: { reason: string }) {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) throw new NotFoundException('User not found');
    await this.repository.updateUserStatus(targetUserId, 'SUSPENDED');
    await this.repository.revokeAllUserSessions(targetUserId);
    await this.logAuditEvent('ACCOUNT_SUSPENDED', {
      adminId,
      targetUserId,
      success: true,
      metadata: { reason: dto.reason },
    });
  }

  async reactivateUser(adminId: string, targetUserId: string) {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) throw new NotFoundException('User not found');
    await this.repository.updateUserStatus(targetUserId, 'ACTIVE');
    await this.logAuditEvent('ACCOUNT_REACTIVATED', {
      adminId,
      targetUserId,
      success: true,
    });
  }

  async startImpersonation(adminId: string, targetUserId: string) {
    const user = await this.repository.findUserById(targetUserId);
    if (!user) throw new NotFoundException('User not found');
    const token = `imp-${targetUserId}-${Date.now()}`;
    return {
      customToken: token,
      targetUser: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  async endImpersonation(_adminId: string, _targetUserId?: string) {
    return;
  }

  async queryAuditLogs(
    filters: {
      userId?: string;
      adminId?: string;
      eventType?: AuthEventType;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: PaginationQueryDto,
  ) {
    const result = await this.repository.findAuditLogs({
      ...pagination,
      userId: filters.userId,
      eventType: filters.eventType,
      success: filters.success,
    });

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.repository.deleteExpiredSessions();
    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }

  async cleanupExpiredGuests(): Promise<number> {
    const result = await this.repository.deleteExpiredGuests();
    this.logger.log(`Cleaned up ${result.count} expired guests`);
    return result.count;
  }

  async cleanupExpiredInvites(): Promise<number> {
    const result = await this.repository.expireOldInvites();
    this.logger.log(`Expired ${result.count} old invites`);
    return result.count;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateInviteCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').substring(0, 64);
  }

  private async logAuditEvent(
    eventType: AuthEventType,
    data: {
      userId?: string;
      adminId?: string;
      targetUserId?: string;
      sessionId?: string;
      success: boolean;
      failureReason?: string;
      ipAddress?: string;
      userAgent?: string;
      deviceType?: string;
      metadata?: unknown;
    },
  ): Promise<void> {
    try {
      await this.repository.createAuditLog({
        eventType,
        userId: data.userId,
        adminId: data.adminId,
        targetUserId: data.targetUserId,
        sessionId: data.sessionId,
        success: data.success,
        failureReason: data.failureReason,
        ipAddressHash: data.ipAddress ? this.hashIp(data.ipAddress) : undefined,
        userAgent: data.userAgent,
        deviceType: (data.deviceType as DeviceType) ?? 'UNKNOWN',
        metadata: data.metadata,
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', error as any);
    }
  }

  private async recordFailedLogin(email: string, ipAddress?: string): Promise<void> {
    const lockout = await this.repository.findLockoutByEmail(email);
    const attempts = (lockout?.failedAttempts ?? 0) + 1;

    let lockedUntil: Date | null = null;
    let lockLevel = lockout?.lockLevel ?? 0;

    if (attempts >= 3 && attempts < 5) {
      lockLevel = 1;
      lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    } else if (attempts >= 5 && attempts < 10) {
      lockLevel = 2;
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    } else if (attempts >= 10) {
      lockLevel = 3;
    }

    await this.repository.upsertLockout(email, {
      failedAttempts: attempts,
      lastFailedAt: new Date(),
      lockedUntil,
      lockLevel,
      requiresEmailUnlock: lockLevel >= 3,
    });

    await this.logAuditEvent('LOGIN_FAILURE', {
      success: false,
      failureReason: 'Invalid credentials',
      ipAddress,
      metadata: { email, attempts },
    });
  }

  private mapUserToResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      companyId: user.companyId ?? null,
      b2bRole: user.b2bRole ?? null,
      role: user.role,
      userType: user.userType,
      status: user.status,
      identityProvider: user.identityProvider,
      preferredLanguage: user.preferredLanguage,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapSessionToResponse(session: any, currentSessionId?: string): SessionResponse {
    return {
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      status: session.status,
      lastActivityAt: session.lastActivityAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    };
  }

  private mapGuestToResponse(guest: any): GuestResponse {
    return {
      id: guest.id,
      deviceType: guest.deviceType,
      appVersion: guest.appVersion,
      firstSeenAt: guest.firstSeenAt?.toISOString?.() ?? new Date().toISOString(),
      lastSeenAt: guest.lastSeenAt?.toISOString?.() ?? new Date().toISOString(),
      expiresAt: guest.expiresAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private mapPersonaToResponse(persona: any): PersonaResponse {
    return {
      id: persona.id,
      code: persona.code,
      name: persona.name,
      description: persona.description,
      primaryGoal: persona.primaryGoal,
      targetSeniority: persona.targetSeniority,
      iconUrl: persona.iconUrl,
    };
  }

  private mapCompanyToResponse(company: any): CompanyResponse {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      status: company.status,
      seatLimit: company.seatLimit,
      currentSeatCount: company.currentSeatCount,
      createdAt: company.createdAt.toISOString(),
    };
  }

  private mapCompanyMemberToResponse(member: any): CompanyMemberResponse {
    return {
      id: member.id,
      email: member.email,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      b2bRole: member.b2bRole,
      joinedAt: member.b2bJoinedAt?.toISOString?.() ?? member.createdAt?.toISOString?.() ?? '',
    };
  }

  private mapInviteToResponse(invite: any): InviteResponse {
    return {
      id: invite.id,
      inviteType: invite.inviteType,
      inviteCode: invite.inviteCode,
      email: invite.email,
      status: invite.status,
      assignedRole: invite.assignedRole,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  private mapAdminToResponse(admin: any): AdminResponse {
    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
      createdAt: admin.createdAt.toISOString(),
    };
  }
}

