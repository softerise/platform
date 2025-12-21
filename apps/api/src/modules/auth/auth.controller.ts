import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ZodPipe, Public, CurrentUser, Roles } from '../_core';
import type { CurrentUserData } from '../_core';
import {
  LoginSchema,
  SignupSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  RevokeSessionSchema,
  RevokeAllSessionsSchema,
  CreateGuestSchema,
  MergeGuestSchema,
  SubmitOnboardingSchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  CreateInviteSchema,
  JoinCompanySchema,
  UpdateMemberRoleSchema,
  CreateAdminSchema,
  UpdateAdminSchema,
  AdminQuerySchema,
  ImpersonateUserSchema,
  PaginationQuerySchema,
  type LoginDto,
  type SignupDto,
  type RefreshTokenDto,
  type UpdateProfileDto,
  type RevokeSessionDto,
  type RevokeAllSessionsDto,
  type CreateGuestDto,
  type MergeGuestDto,
  type SubmitOnboardingDto,
  type CreateCompanyDto,
  type UpdateCompanyDto,
  type CreateInviteDto,
  type JoinCompanyDto,
  type UpdateMemberRoleDto,
  type CreateAdminDto,
  type UpdateAdminDto,
  type AdminQueryDto,
  type ImpersonateUserDto,
  type PaginationQueryDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  @Public()
  @Post('signup')
  async signup(@Body(new ZodPipe(SignupSchema)) dto: SignupDto, @Req() req: Request) {
    const guestId = req.headers['x-guest-id'] as string | undefined;
    return this.authService.signup({ ...dto, guestId });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodPipe(LoginSchema)) dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.login({ ...dto, ipAddress, userAgent });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentUserData, @Req() req: Request) {
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
      await this.authService.logout(user.uid, sessionId);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: CurrentUserData, @Req() req: Request) {
    const currentSessionId = req.headers['x-session-id'] as string;
    const result = await this.authService.logoutAll(user.uid, currentSessionId);
    return { message: `Revoked ${result.revokedCount} sessions` };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body(new ZodPipe(RefreshTokenSchema)) _dto: RefreshTokenDto) {
    return { message: 'Token refresh not implemented' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body(new ZodPipe(VerifyEmailSchema)) dto: { token: string }) {
    return { message: `Email verification not implemented for token ${dto.token}` };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(new ZodPipe(ForgotPasswordSchema)) _dto: { email: string }) {
    return { message: 'Password reset email sent (placeholder)' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodPipe(ResetPasswordSchema)) _dto: { token: string; password: string },
  ) {
    return { message: 'Password reset not implemented' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() _user: CurrentUserData,
    @Body(new ZodPipe(ChangePasswordSchema)) _dto: { currentPassword: string; newPassword: string },
  ) {
    return { message: 'Password change not implemented' };
  }

  // ==========================================================================
  // PROFILE
  // ==========================================================================

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    if (!user?.uid) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.authService.getCurrentUser(user.uid);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.uid, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: CurrentUserData) {
    await this.authService.deleteAccount(user.uid);
  }

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  @Get('sessions')
  async getSessions(@CurrentUser() user: CurrentUserData) {
    return this.authService.getActiveSessions(user.uid);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: CurrentUserData,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(new ZodPipe(RevokeSessionSchema)) dto: RevokeSessionDto,
  ) {
    await this.authService.revokeSession(sessionId, user.uid, dto.reason);
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(RevokeAllSessionsSchema)) dto: RevokeAllSessionsDto,
    @Req() req: Request,
  ) {
    const currentSessionId = dto.exceptCurrent ? (req.headers['x-session-id'] as string) : undefined;
    const result = await this.authService.logoutAll(user.uid, currentSessionId);
    return { message: `Revoked ${result.revokedCount} sessions` };
  }

  // ==========================================================================
  // GUEST
  // ==========================================================================

  @Public()
  @Post('guest')
  async createGuest(@Body(new ZodPipe(CreateGuestSchema)) dto: CreateGuestDto) {
    return this.authService.createOrGetGuest(dto);
  }

  @Public()
  @Get('guest/:guestId')
  async getGuest(@Param('guestId', ParseUUIDPipe) guestId: string) {
    return this.authService.getGuest(guestId);
  }

  @Post('guest/merge')
  @HttpCode(HttpStatus.OK)
  async mergeGuest(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(MergeGuestSchema)) dto: MergeGuestDto,
  ) {
    await this.authService.mergeGuestToUser(user.uid, dto.guestId);
    return { message: 'Guest merged successfully' };
  }

  // ==========================================================================
  // ONBOARDING
  // ==========================================================================

  @Public()
  @Get('onboarding/questions')
  async getOnboardingQuestions() {
    return this.authService.getOnboardingQuestions();
  }

  @Get('onboarding/progress')
  async getOnboardingProgress(@CurrentUser() user: CurrentUserData) {
    return this.authService.getOnboardingProgress(user.uid);
  }

  @Post('onboarding/submit')
  @HttpCode(HttpStatus.OK)
  async submitOnboarding(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(SubmitOnboardingSchema)) dto: SubmitOnboardingDto,
  ) {
    return this.authService.submitOnboarding(user.uid, dto);
  }

  @Public()
  @Get('personas')
  async getPersonas() {
    return this.authService.getPersonas();
  }

  // ==========================================================================
  // B2B - COMPANY
  // ==========================================================================

  @Post('company')
  async createCompany(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(CreateCompanySchema)) dto: CreateCompanyDto,
  ) {
    return this.authService.createCompany(user.uid, dto);
  }

  @Get('company/:companyId')
  async getCompany(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.authService.getCompany(companyId);
  }

  @Patch('company/:companyId')
  async updateCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body(new ZodPipe(UpdateCompanySchema)) dto: UpdateCompanyDto,
  ) {
    return this.authService.updateCompany(companyId, dto);
  }

  @Get('company/:companyId/members')
  async getCompanyMembers(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query(new ZodPipe(PaginationQuerySchema)) query: PaginationQueryDto,
  ) {
    return this.authService.listMembers(companyId, query);
  }

  @Post('company/join')
  @HttpCode(HttpStatus.OK)
  async joinCompany(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(JoinCompanySchema)) dto: JoinCompanyDto,
  ) {
    return this.authService.joinCompany(user.uid, dto);
  }

  @Post('company/leave')
  @HttpCode(HttpStatus.OK)
  async leaveCompany(@CurrentUser() user: CurrentUserData) {
    await this.authService.leaveCompany(user.uid);
    return { message: 'Left company successfully' };
  }

  @Patch('company/:companyId/members/role')
  async updateMemberRole(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body(new ZodPipe(UpdateMemberRoleSchema)) dto: UpdateMemberRoleDto,
  ) {
    await this.authService.updateMemberRole(companyId, dto);
    return { message: 'Role updated successfully' };
  }

  @Delete('company/:companyId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.authService.removeMember(companyId, userId);
  }

  // ==========================================================================
  // B2B - INVITES
  // ==========================================================================

  @Post('company/:companyId/invites')
  async createInvite(
    @CurrentUser() user: CurrentUserData,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body(new ZodPipe(CreateInviteSchema)) dto: CreateInviteDto,
  ) {
    return this.authService.createInvite(companyId, user.uid, dto);
  }

  @Get('company/:companyId/invites')
  async getCompanyInvites(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query(new ZodPipe(PaginationQuerySchema)) query: PaginationQueryDto,
  ) {
    return this.authService.getCompanyInvites(companyId, query);
  }

  @Delete('company/:companyId/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvite(
    @CurrentUser() user: CurrentUserData,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    await this.authService.cancelInvite(companyId, inviteId, user.uid);
  }

  // ==========================================================================
  // ADMIN - BACKOFFICE
  // ==========================================================================

  // Place static admin/users and audit-logs routes before param routes to avoid UUID parsing on "users".

  @Public()
  @Roles('SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER')
  @Get('admin/users')
  async listUsers(
    @Query(new ZodPipe(PaginationQuerySchema)) pagination: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: any,
    @Query('userType') userType?: any,
  ) {
    return this.authService.listUsers(
      {
        search: search ?? undefined,
        status: status ?? undefined,
        userType: userType ?? undefined,
      },
      pagination,
    );
  }

  @Public()
  @Roles('SUPER_ADMIN', 'SUPPORT_AGENT', 'B2B_MANAGER')
  @Get('admin/users/:userId')
  async getUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.authService.getUserDetail(userId);
  }

  @Public()
  @Roles('SUPER_ADMIN', 'SUPPORT_AGENT')
  @Get('admin/audit-logs')
  async listAuditLogs(
    @Query(new ZodPipe(PaginationQuerySchema)) pagination: PaginationQueryDto,
  ) {
    return this.authService.listAuditLogsPlaceholder(pagination);
  }

  @Roles('SUPER_ADMIN', 'B2B_MANAGER')
  @Post('admin')
  async createAdmin(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodPipe(CreateAdminSchema)) dto: CreateAdminDto,
  ) {
    return this.authService.createAdmin(dto, user.uid);
  }

  @Roles('SUPER_ADMIN', 'B2B_MANAGER')
  @Get('admin/:adminId')
  async getAdmin(@Param('adminId', ParseUUIDPipe) adminId: string) {
    return this.authService.getAdmin(adminId);
  }

  @Roles('SUPER_ADMIN')
  @Patch('admin/:adminId')
  async updateAdmin(
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @Body(new ZodPipe(UpdateAdminSchema)) dto: UpdateAdminDto,
  ) {
    return this.authService.updateAdmin(adminId, dto);
  }

  @Roles('SUPER_ADMIN', 'B2B_MANAGER')
  @Get('admins')
  async listAdmins(@Query(new ZodPipe(AdminQuerySchema)) query: AdminQueryDto) {
    return this.authService.listAdmins(query);
  }

  @Public()
  @Roles('SUPER_ADMIN', 'SUPPORT_AGENT')
  @Post('admin/users/:userId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @CurrentUser() user: CurrentUserData,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { reason: string },
  ) {
    await this.authService.suspendUser(user.uid, userId, { reason: body.reason });
    return { message: 'User suspended successfully' };
  }

  @Public()
  @Roles('SUPER_ADMIN', 'SUPPORT_AGENT')
  @Post('admin/users/:userId/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(
    @CurrentUser() user: CurrentUserData,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.authService.reactivateUser(user.uid, userId);
    return { message: 'User reactivated successfully' };
  }

  @Public()
  @Roles('SUPER_ADMIN')
  @Post('admin/impersonate')
  @HttpCode(HttpStatus.OK)
  async impersonateUser(
    @CurrentUser() admin: CurrentUserData,
    @Body(new ZodPipe(ImpersonateUserSchema)) dto: ImpersonateUserDto,
  ) {
    return this.authService.startImpersonation(admin.uid, dto.userId);
  }

  @Public()
  @Roles('SUPER_ADMIN')
  @Post('admin/impersonate/end')
  @HttpCode(HttpStatus.OK)
  async endImpersonation(@CurrentUser() admin: CurrentUserData) {
    await this.authService.endImpersonation(admin.uid);
    return { message: 'Impersonation ended' };
  }
}

