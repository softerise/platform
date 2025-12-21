export class UserCreatedEvent {
  constructor(public readonly payload: { id: string; email: string }) {}
}

export class UserLoggedInEvent {
  constructor(public readonly payload: { userId: string; sessionId: string }) {}
}

export class UserLoggedOutEvent {
  constructor(public readonly payload: { userId: string; sessionId: string }) {}
}

export class SessionRevokedEvent {
  constructor(public readonly payload: { userId: string; sessionId: string }) {}
}

export class GuestCreatedEvent {
  constructor(public readonly payload: { id: string; deviceType: string }) {}
}

export class GuestMergedEvent {
  constructor(public readonly payload: { guestId: string; userId: string }) {}
}

export class OnboardingCompletedEvent {
  constructor(public readonly payload: { userId: string; personaId: string }) {}
}

export class CompanyCreatedEvent {
  constructor(public readonly payload: { id: string; name: string; createdByUserId: string }) {}
}

export class UserJoinedCompanyEvent {
  constructor(public readonly payload: { userId: string; companyId: string; role: string }) {}
}

export class UserLeftCompanyEvent {
  constructor(public readonly payload: { userId: string; companyId: string }) {}
}

export class InviteCreatedEvent {
  constructor(
    public readonly payload: {
      inviteId: string;
      companyId: string;
      inviteType: string;
      email?: string | null;
    },
  ) {}
}

export class InviteAcceptedEvent {
  constructor(public readonly payload: { inviteId: string; userId: string; companyId: string }) {}
}

export class AdminCreatedEvent {
  constructor(public readonly payload: { id: string; email: string; role: string }) {}
}

