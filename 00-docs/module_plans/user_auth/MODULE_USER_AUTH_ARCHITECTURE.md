# MODULE_USER_AUTH_ARCHITECTURE.md

# PART 1: Context, Architecture, Data Model, API & Events

---

## HEADER

```yaml
module_name: User Authentication Module
module_id: user-auth
version: "1.0.0"
updated: 2024-12-16
status: ready
owner: Backend Team

parent_doc: ./PROJECT_CHARTER.md

changelog:
  - {v: "1.0.0", date: "2024-12-16", note: "Initial specification"}

```

---

## MODULE_CONTEXT

### Overview

```yaml
purpose: >
  User Authentication Module manages the complete identity lifecycle for Softerise platform,
  including anonymous guest tracking, multi-provider authentication via Firebase, mandatory
  onboarding flow, session management, and B2B company membership. It serves as the security
  foundation for all other modules.

business_value: >
  Enables secure, seamless user experience from first anonymous visit through conversion to
  paying customer. Supports both B2C individual users and B2B enterprise deployments with
  role-based access control. Critical for platform trust, compliance (GDPR/SOC2), and
  conversion optimization through guest-to-user data preservation.

scope:
  in:
    - User registration and authentication (Email, Google, Apple)
    - Session management with multi-device support (max 5)
    - Guest user tracking and merge on signup
    - Mandatory onboarding flow and persona assignment
    - B2B company membership and invite system
    - Account lockout and security monitoring
    - Authentication audit logging
    - Backoffice admin authentication
    - Firebase custom claims management
  out:
    - SPI score calculation (→ Recommendation Engine Module)
    - Course/Practice progress storage (→ Mobile Feature Module)
    - Subscription billing and payments (→ Billing Module - future)
    - Company departments/teams management (→ B2B Feature Module)
    - Push notification delivery (→ Mobile Feature Module)
    - Content management (→ Backoffice Feature Module)

dependencies:
  depends_on:
    - {module: "firebase-auth", reason: "External authentication provider"}
    - {module: "billing (future)", reason: "Subscription status for custom claims"}
  depended_by:
    - {module: "mobile-feature", reason: "User identity, session validation, guest merge events"}
    - {module: "b2b-feature", reason: "Company membership, user roles"}
    - {module: "recommendation-engine", reason: "Persona data, onboarding answers"}
    - {module: "backoffice-feature", reason: "User management, audit logs"}

```

### User Flows

```yaml
user_flows:

  guest_creation:
    actor: "Anonymous Visitor"
    goal: "Start using app without signup"
    detailed_steps:
      - step: 1
        action: "Open app/web for first time"
        system_response: "Detect no auth token, no guest_id in storage"
        module_components: [GuestService]
      - step: 2
        action: "First API call made"
        system_response: "Generate UUID v7, create Guest record, return guest_id"
        module_components: [GuestService, GuestRepository]
      - step: 3
        action: "Client stores guest_id locally"
        system_response: "Set 90-day expiry, track device fingerprint"
        module_components: [GuestService]
    success_outcome: "Guest can browse limited content, progress tracked"
    failure_scenarios:
      - {scenario: "Device fingerprint unavailable", handling: "Create guest without fingerprint, merge by guest_id only"}

  email_signup:
    actor: "Guest or New Visitor"
    goal: "Create account with email/password"
    detailed_steps:
      - step: 1
        action: "Enter email and password"
        system_response: "Validate format, check email not registered"
        module_components: [AuthService, UserRepository]
      - step: 2
        action: "Submit signup form"
        system_response: "Create Firebase user, create DB user with PENDING_VERIFICATION"
        module_components: [AuthService, FirebaseService, UserRepository]
      - step: 3
        action: "Receive verification email, click link"
        system_response: "Firebase verifies, webhook updates user to PENDING_ONBOARDING"
        module_components: [AuthService, FirebaseService]
      - step: 4
        action: "If guest_id present, prompt merge"
        system_response: "Execute atomic merge transaction, emit auth.guest_merged event"
        module_components: [GuestService, UserRepository]
    success_outcome: "User created, ready for onboarding"
    failure_scenarios:
      - {scenario: "Email already registered", handling: "Return 409 conflict with login suggestion"}
      - {scenario: "Weak password", handling: "Return 400 with password requirements"}
      - {scenario: "Firebase unavailable", handling: "Return 503, retry guidance"}

  social_signup:
    actor: "Guest or New Visitor"
    goal: "Create account with Google or Apple"
    detailed_steps:
      - step: 1
        action: "Click Google/Apple sign in button"
        system_response: "Redirect to OAuth provider"
        module_components: [AuthService, FirebaseService]
      - step: 2
        action: "Complete OAuth flow"
        system_response: "Receive Firebase ID token"
        module_components: [FirebaseService]
      - step: 3
        action: "Send token to backend"
        system_response: "Verify token, check if user exists"
        module_components: [AuthService, FirebaseService, UserRepository]
      - step: 4
        action: "If new user, create account"
        system_response: "Create user with PENDING_ONBOARDING (email pre-verified)"
        module_components: [AuthService, UserRepository]
      - step: 5
        action: "If guest_id present, prompt merge"
        system_response: "Execute atomic merge transaction"
        module_components: [GuestService]
    success_outcome: "User created with verified email, ready for onboarding"
    failure_scenarios:
      - {scenario: "Email from OAuth already registered with different provider", handling: "Suggest login with original provider"}

  login:
    actor: "Registered User"
    goal: "Authenticate and access platform"
    detailed_steps:
      - step: 1
        action: "Enter credentials or use social login"
        system_response: "Authenticate with Firebase"
        module_components: [AuthService, FirebaseService]
      - step: 2
        action: "Send ID token to backend"
        system_response: "Verify token, check account status and lockout"
        module_components: [AuthService, LockoutService]
      - step: 3
        action: "Token valid, account active"
        system_response: "Check session count, create new session (revoke oldest if 5 exist)"
        module_components: [SessionService, SessionRepository]
      - step: 4
        action: "Session created"
        system_response: "Return user data with custom claims, log audit event"
        module_components: [AuthService, AuditService]
    success_outcome: "User authenticated with active session"
    failure_scenarios:
      - {scenario: "Invalid credentials", handling: "Increment lockout counter, return 401"}
      - {scenario: "Account locked", handling: "Return 423 with unlock instructions"}
      - {scenario: "Account suspended", handling: "Return 403 with support contact"}
      - {scenario: "Onboarding incomplete", handling: "Return user with redirect to onboarding"}

  onboarding_completion:
    actor: "User with PENDING_ONBOARDING status"
    goal: "Complete mandatory profile setup"
    detailed_steps:
      - step: 1
        action: "View onboarding questions"
        system_response: "Return active questions in display order"
        module_components: [OnboardingService, OnboardingQuestionRepository]
      - step: 2
        action: "Answer all required questions"
        system_response: "Validate answers against question types"
        module_components: [OnboardingService]
      - step: 3
        action: "Submit answers"
        system_response: "Store answers, calculate persona, assign to user"
        module_components: [OnboardingService, PersonaService, OnboardingAnswerRepository]
      - step: 4
        action: "Onboarding complete"
        system_response: "Update user status to ACTIVE, emit auth.onboarding_completed"
        module_components: [AuthService, UserRepository, EventService]
    success_outcome: "User ACTIVE with persona, full platform access"
    failure_scenarios:
      - {scenario: "Missing required answers", handling: "Return 400 with missing fields"}
      - {scenario: "Invalid answer format", handling: "Return 400 with validation details"}

  b2b_invite_acceptance:
    actor: "Invited Employee (existing or new user)"
    goal: "Join company as B2B member"
    detailed_steps:
      - step: 1
        action: "Click invite link from email"
        system_response: "Validate invite code, check not expired/cancelled/used"
        module_components: [B2BService, InviteRepository]
      - step: 2
        action: "Login or signup"
        system_response: "Authenticate user (new or existing)"
        module_components: [AuthService]
      - step: 3
        action: "Confirm join company"
        system_response: "Check company seat availability"
        module_components: [B2BService, CompanyRepository]
      - step: 4
        action: "Accept invite"
        system_response: "Atomic: update invite, update user to B2B, increment seats, audit log"
        module_components: [B2BService, UserRepository, CompanyRepository, AuditService]
    success_outcome: "User is B2B member with assigned role"
    failure_scenarios:
      - {scenario: "Invite expired", handling: "Return 410 Gone with re-invite suggestion"}
      - {scenario: "Invite cancelled", handling: "Return 410 Gone"}
      - {scenario: "Seat limit reached", handling: "Return 403 with admin contact"}
      - {scenario: "User already in another company", handling: "Return 409 with leave instruction"}

  session_management:
    actor: "Authenticated User"
    goal: "View and manage active sessions"
    detailed_steps:
      - step: 1
        action: "View active sessions"
        system_response: "Return list of active sessions with device info"
        module_components: [SessionService, SessionRepository]
      - step: 2
        action: "Revoke specific session"
        system_response: "Mark session REVOKED, revoke Firebase refresh token"
        module_components: [SessionService, FirebaseService]
      - step: 3
        action: "Logout all devices"
        system_response: "Revoke all sessions, revoke all Firebase tokens"
        module_components: [SessionService, FirebaseService, AuditService]
    success_outcome: "Sessions managed, unwanted access removed"
    failure_scenarios:
      - {scenario: "Cannot revoke current session via list", handling: "Use /logout endpoint instead"}

  account_deletion:
    actor: "Authenticated User"
    goal: "Delete account (GDPR right to erasure)"
    detailed_steps:
      - step: 1
        action: "Request account deletion"
        system_response: "Re-authenticate to confirm identity"
        module_components: [AuthService]
      - step: 2
        action: "Confirm deletion"
        system_response: "Set status to DELETED, set deleted_at, revoke all sessions"
        module_components: [AuthService, SessionService, AuditService]
      - step: 3
        action: "30-day cooling off period"
        system_response: "Account inactive but recoverable"
        module_components: [Scheduled Job]
      - step: 4
        action: "After 30 days, hard delete job runs"
        system_response: "Anonymize answers, hard delete user, emit auth.user_deleted"
        module_components: [CleanupService, EventService]
    success_outcome: "Account deleted, data anonymized per GDPR"
    failure_scenarios:
      - {scenario: "User changes mind within 30 days", handling: "Support can reactivate"}

```

---

## ARCHITECTURE

### Component Diagram

```mermaid
graph TB
    subgraph "Clients"
        MOB[Mobile App - Flutter]
        WEB[Web Client]
        BO[Backoffice Panel]
    end

    subgraph "API Gateway"
        GW[API Gateway]
        RL[Rate Limiter]
        JV[JWT Validator]
    end

    subgraph "User Auth Module"
        AC[AuthController]
        SC[SessionController]
        OC[OnboardingController]
        BC[B2BController]
        ADC[AdminController]

        AS[AuthService]
        SS[SessionService]
        GS[GuestService]
        OS[OnboardingService]
        BS[B2BService]
        LS[LockoutService]
        ADS[AdminService]
        AUS[AuditService]

        UR[UserRepository]
        SR[SessionRepository]
        GR[GuestRepository]
        OQR[OnboardingQuestionRepository]
        OAR[OnboardingAnswerRepository]
        PR[PersonaRepository]
        CR[CompanyRepository]
        IR[InviteRepository]
        AR[AuditRepository]
        LR[LockoutRepository]
    end

    subgraph "External Services"
        FB[Firebase Auth]
        PG[(PostgreSQL)]
        RD[(Valkey/Redis)]
        BQ[BullMQ]
    end

    MOB --> GW
    WEB --> GW
    BO --> GW

    GW --> RL
    RL --> JV
    JV --> AC
    JV --> SC
    JV --> OC
    JV --> BC
    JV --> ADC

    AC --> AS
    AC --> GS
    SC --> SS
    OC --> OS
    BC --> BS
    ADC --> ADS

    AS --> UR
    AS --> AUS
    AS --> LS
    SS --> SR
    GS --> GR
    OS --> OQR
    OS --> OAR
    OS --> PR
    BS --> CR
    BS --> IR
    BS --> UR
    AUS --> AR
    LS --> LR

    AS --> FB
    SS --> FB
    LS --> RD
    RL --> RD

    UR --> PG
    SR --> PG
    GR --> PG
    OQR --> PG
    OAR --> PG
    PR --> PG
    CR --> PG
    IR --> PG
    AR --> PG
    LR --> PG

    AS --> BQ
    BS --> BQ
    OS --> BQ

```

### Components

```yaml
components:

  AuthController:
    name: "Authentication Controller"
    type: controller
    purpose: "Handle authentication HTTP endpoints"
    responsibilities:
      - Route /auth/* endpoints
      - Request validation
      - Response formatting
    interfaces:
      exposes: "REST endpoints for auth operations"
      consumes: "AuthService, GuestService"

  SessionController:
    name: "Session Controller"
    type: controller
    purpose: "Handle session management HTTP endpoints"
    responsibilities:
      - Route /sessions/* endpoints
      - List, revoke session operations
    interfaces:
      exposes: "REST endpoints for session operations"
      consumes: "SessionService"

  OnboardingController:
    name: "Onboarding Controller"
    type: controller
    purpose: "Handle onboarding HTTP endpoints"
    responsibilities:
      - Route /onboarding/* endpoints
      - Question retrieval, answer submission
    interfaces:
      exposes: "REST endpoints for onboarding"
      consumes: "OnboardingService"

  B2BController:
    name: "B2B Controller"
    type: controller
    purpose: "Handle B2B membership HTTP endpoints"
    responsibilities:
      - Route /b2b/* endpoints
      - Invite management, member management
    interfaces:
      exposes: "REST endpoints for B2B operations"
      consumes: "B2BService"

  AdminController:
    name: "Admin Controller"
    type: controller
    purpose: "Handle backoffice admin HTTP endpoints"
    responsibilities:
      - Route /admin/* endpoints
      - User management, impersonation
    interfaces:
      exposes: "REST endpoints for admin operations"
      consumes: "AdminService"

  AuthService:
    name: "Authentication Service"
    type: service
    purpose: "Core authentication business logic"
    responsibilities:
      - Signup flow orchestration
      - Login validation and processing
      - Password reset flow
      - Email change flow
      - Account deletion
      - Firebase token verification
      - Custom claims management
    interfaces:
      exposes: "signup(), login(), logout(), verifyEmail(), resetPassword(), deleteAccount()"
      consumes: "UserRepository, FirebaseService, AuditService, LockoutService, EventService"

  SessionService:
    name: "Session Service"
    type: service
    purpose: "Session lifecycle management"
    responsibilities:
      - Create sessions with limit enforcement
      - Revoke single/all sessions
      - Session expiry management
      - Firebase token revocation
    interfaces:
      exposes: "createSession(), revokeSession(), revokeAllSessions(), getActiveSessions()"
      consumes: "SessionRepository, FirebaseService, AuditService"

  GuestService:
    name: "Guest Service"
    type: service
    purpose: "Anonymous user tracking"
    responsibilities:
      - Guest creation with idempotency
      - Activity tracking
      - Guest to user merge
      - Expired guest cleanup
    interfaces:
      exposes: "createOrGetGuest(), updateLastSeen(), mergeToUser()"
      consumes: "GuestRepository, EventService"

  OnboardingService:
    name: "Onboarding Service"
    type: service
    purpose: "Onboarding flow management"
    responsibilities:
      - Retrieve active questions
      - Validate and store answers
      - Calculate persona from answers
      - Update user status on completion
    interfaces:
      exposes: "getQuestions(), submitAnswers(), updateAnswers()"
      consumes: "OnboardingQuestionRepository, OnboardingAnswerRepository, PersonaRepository, UserRepository, EventService"

  B2BService:
    name: "B2B Service"
    type: service
    purpose: "Company membership management"
    responsibilities:
      - Create and manage invites
      - Process invite acceptance
      - Manage company members
      - Seat limit enforcement
      - Member role management
    interfaces:
      exposes: "createInvite(), acceptInvite(), cancelInvite(), removeMember(), updateMemberRole(), leaveCompany()"
      consumes: "CompanyRepository, InviteRepository, UserRepository, AuditService, EventService"

  LockoutService:
    name: "Lockout Service"
    type: service
    purpose: "Account lockout management"
    responsibilities:
      - Track failed login attempts
      - Enforce progressive lockout
      - Generate unlock tokens
      - Auto-unlock on expiry
    interfaces:
      exposes: "checkLockout(), recordFailedAttempt(), recordSuccessfulLogin(), unlockAccount()"
      consumes: "LockoutRepository, Valkey cache"

  AdminService:
    name: "Admin Service"
    type: service
    purpose: "Backoffice administrative operations"
    responsibilities:
      - User search and listing
      - User suspension/reactivation
      - Impersonation management
      - Audit log queries
    interfaces:
      exposes: "listUsers(), getUser(), suspendUser(), reactivateUser(), startImpersonation(), endImpersonation()"
      consumes: "UserRepository, AuditRepository, SessionService"

  AuditService:
    name: "Audit Service"
    type: service
    purpose: "Authentication audit logging"
    responsibilities:
      - Log all auth events
      - Immutable record creation
      - Audit query support
    interfaces:
      exposes: "logEvent(), queryEvents()"
      consumes: "AuditRepository"

  FirebaseService:
    name: "Firebase Service"
    type: service
    purpose: "Firebase Admin SDK wrapper"
    responsibilities:
      - Verify ID tokens
      - Set custom claims
      - Revoke refresh tokens
      - Create custom tokens (for impersonation)
    interfaces:
      exposes: "verifyToken(), setCustomClaims(), revokeRefreshTokens(), createCustomToken()"
      consumes: "Firebase Admin SDK"

```

### Tech Stack

```yaml
stack:
  runtime: "Node.js 20 LTS"
  framework: "NestJS 10.x"
  database: "PostgreSQL 15 (Render)"
  cache: "Valkey (Redis-compatible, Render)"
  queue: "BullMQ"
  storage: "N/A for this module"

  key_libraries:
    - {name: "@nestjs/common", purpose: "Core NestJS framework", version: "^10.0.0"}
    - {name: "@nestjs/passport", purpose: "Authentication middleware", version: "^10.0.0"}
    - {name: "firebase-admin", purpose: "Firebase Admin SDK", version: "^12.0.0"}
    - {name: "@prisma/client", purpose: "Database ORM", version: "^5.0.0"}
    - {name: "bullmq", purpose: "Job queue for events", version: "^5.0.0"}
    - {name: "ioredis", purpose: "Redis/Valkey client", version: "^5.0.0"}
    - {name: "zod", purpose: "Request validation", version: "^3.22.0"}
    - {name: "pino", purpose: "Structured logging", version: "^8.0.0"}
    - {name: "uuid", purpose: "UUID v7 generation", version: "^9.0.0"}
    - {name: "@nestjs/throttler", purpose: "Rate limiting", version: "^5.0.0"}

```

---

## DATA_MODEL

### Entities

```
// Reference: MODULE_USER_AUTH_DB_PLAN.md for complete specifications

// User - Core identity entity
model User {
  id                    String    @id @default(uuid()) @db.Uuid
  firebaseUid           String    @unique @map("firebase_uid") @db.VarChar(128)
  email                 String    @unique @db.VarChar(255)
  emailVerifiedAt       DateTime? @map("email_verified_at") @db.Timestamptz
  displayName           String?   @map("display_name") @db.VarChar(100)
  avatarUrl             String?   @map("avatar_url") @db.VarChar(500)
  identityProvider      IdentityProvider @default(EMAIL) @map("identity_provider")
  externalIdentityId    String?   @map("external_identity_id") @db.VarChar(255)
  userType              UserType  @default(B2C) @map("user_type")
  companyId             String?   @map("company_id") @db.Uuid
  b2bRole               B2BRole?  @map("b2b_role")
  b2bJoinedAt           DateTime? @map("b2b_joined_at") @db.Timestamptz
  status                UserStatus @default(PENDING_VERIFICATION)
  personaId             String?   @map("persona_id") @db.Uuid
  onboardingCompletedAt DateTime? @map("onboarding_completed_at") @db.Timestamptz
  onboardingUpdatedAt   DateTime? @map("onboarding_updated_at") @db.Timestamptz
  preferredLanguage     String    @default("en") @map("preferred_language") @db.VarChar(5)
  timezone              String?   @db.VarChar(50)
  lastLoginAt           DateTime? @map("last_login_at") @db.Timestamptz
  lastLoginIp           String?   @map("last_login_ip") @db.VarChar(45)
  mergedFromGuestId     String?   @map("merged_from_guest_id") @db.Uuid
  passwordChangedAt     DateTime? @map("password_changed_at") @db.Timestamptz
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt             DateTime? @map("deleted_at") @db.Timestamptz

  // Relations
  company               Company?  @relation(fields: [companyId], references: [id])
  persona               Persona?  @relation(fields: [personaId], references: [id])
  mergedFromGuest       Guest?    @relation("MergedGuest", fields: [mergedFromGuestId], references: [id])
  sessions              UserSession[]
  onboardingAnswers     OnboardingAnswer[]
  invitesCreated        CompanyInvite[] @relation("InvitedBy")
  inviteAccepted        CompanyInvite?  @relation("AcceptedBy")

  @@index([email])
  @@index([companyId])
  @@index([status])
  @@index([userType])
  @@index([createdAt])
  @@index([personaId])
  @@map("users")
}

// Guest - Anonymous visitor tracking
model Guest {
  id                String    @id @default(uuid()) @db.Uuid
  deviceFingerprint String?   @unique @map("device_fingerprint") @db.VarChar(255)
  deviceType        DeviceType @map("device_type")
  appVersion        String?   @map("app_version") @db.VarChar(20)
  firstSeenAt       DateTime  @default(now()) @map("first_seen_at") @db.Timestamptz
  lastSeenAt        DateTime  @default(now()) @map("last_seen_at") @db.Timestamptz
  mergedToUserId    String?   @map("merged_to_user_id") @db.Uuid
  mergedAt          DateTime? @map("merged_at") @db.Timestamptz
  expiresAt         DateTime  @map("expires_at") @db.Timestamptz
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  mergedToUser      User?     @relation("MergedToUser", fields: [mergedToUserId], references: [id])
  userMergedFrom    User[]    @relation("MergedGuest")

  @@index([deviceFingerprint])
  @@index([expiresAt])
  @@index([mergedToUserId])
  @@map("guests")
}

// UserSession - Active authentication sessions
model UserSession {
  id              String        @id @default(uuid()) @db.Uuid
  userId          String        @map("user_id") @db.Uuid
  deviceType      DeviceType    @map("device_type")
  deviceName      String?       @map("device_name") @db.VarChar(100)
  deviceId        String?       @map("device_id") @db.VarChar(255)
  ipAddress       String?       @map("ip_address") @db.VarChar(45)
  userAgent       String?       @map("user_agent") @db.VarChar(500)
  firebaseTokenId String        @map("firebase_token_id") @db.VarChar(255)
  status          SessionStatus @default(ACTIVE)
  lastActivityAt  DateTime      @default(now()) @map("last_activity_at") @db.Timestamptz
  expiresAt       DateTime      @map("expires_at") @db.Timestamptz
  revokedAt       DateTime?     @map("revoked_at") @db.Timestamptz
  revokedReason   String?       @map("revoked_reason") @db.VarChar(100)
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, status])
  @@index([expiresAt])
  @@map("user_sessions")
}

// Persona - User profile archetype
model Persona {
  id              String         @id @default(uuid()) @db.Uuid
  code            String         @unique @db.VarChar(50)
  name            String         @db.VarChar(100)
  description     String         @db.Text
  primaryGoal     String         @map("primary_goal") @db.VarChar(200)
  targetSeniority SeniorityLevel @map("target_seniority")
  iconUrl         String?        @map("icon_url") @db.VarChar(500)
  isActive        Boolean        @default(true) @map("is_active")
  displayOrder    Int            @default(0) @map("display_order")
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  users           User[]

  @@index([isActive])
  @@map("personas")
}

// OnboardingQuestion - Onboarding flow questions
model OnboardingQuestion {
  id            String       @id @default(uuid()) @db.Uuid
  code          String       @unique @db.VarChar(50)
  questionText  String       @map("question_text") @db.Text
  questionType  QuestionType @map("question_type")
  options       Json?        @db.JsonB
  isRequired    Boolean      @default(true) @map("is_required")
  displayOrder  Int          @map("display_order")
  isActive      Boolean      @default(true) @map("is_active")
  personaWeight Json?        @map("persona_weight") @db.JsonB
  createdAt     DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  answers       OnboardingAnswer[]

  @@index([isActive, displayOrder])
  @@map("onboarding_questions")
}

// OnboardingAnswer - User responses to onboarding
model OnboardingAnswer {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  questionId  String   @map("question_id") @db.Uuid
  answerValue Json     @map("answer_value") @db.JsonB
  version     Int      @default(1)
  isCurrent   Boolean  @default(true) @map("is_current")
  answeredAt  DateTime @default(now()) @map("answered_at") @db.Timestamptz
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  user        User     @relation(fields: [userId], references: [id])
  question    OnboardingQuestion @relation(fields: [questionId], references: [id])

  @@unique([userId, questionId], name: "uq_onboarding_answers_user_question_current")
  @@index([userId])
  @@index([questionId])
  @@map("onboarding_answers")
}

// Company - B2B organization
model Company {
  id                  String        @id @default(uuid()) @db.Uuid
  name                String        @db.VarChar(200)
  slug                String        @unique @db.VarChar(100)
  logoUrl             String?       @map("logo_url") @db.VarChar(500)
  status              CompanyStatus @default(ACTIVE)
  seatLimit           Int           @default(10) @map("seat_limit")
  currentSeatCount    Int           @default(0) @map("current_seat_count")
  defaultInviteCode   String        @unique @map("default_invite_code") @db.VarChar(20)
  settings            Json          @default("{}") @db.JsonB
  createdAt           DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt           DateTime?     @map("deleted_at") @db.Timestamptz

  // Relations
  users               User[]
  invites             CompanyInvite[]

  @@index([status])
  @@index([name])
  @@map("companies")
}

// CompanyInvite - B2B membership invitations
model CompanyInvite {
  id                String       @id @default(uuid()) @db.Uuid
  companyId         String       @map("company_id") @db.Uuid
  inviteType        InviteType   @map("invite_type")
  inviteCode        String       @unique @map("invite_code") @db.VarChar(50)
  email             String?      @db.VarChar(255)
  status            InviteStatus @default(PENDING)
  maxUses           Int?         @map("max_uses")
  currentUses       Int          @default(0) @map("current_uses")
  assignedRole      B2BRole      @default(EMPLOYEE) @map("assigned_role")
  invitedByUserId   String       @map("invited_by_user_id") @db.Uuid
  personalMessage   String?      @map("personal_message") @db.Text
  expiresAt         DateTime     @map("expires_at") @db.Timestamptz
  acceptedByUserId  String?      @unique @map("accepted_by_user_id") @db.Uuid
  acceptedAt        DateTime?    @map("accepted_at") @db.Timestamptz
  cancelledAt       DateTime?    @map("cancelled_at") @db.Timestamptz
  cancelledByUserId String?      @map("cancelled_by_user_id") @db.Uuid
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  company           Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invitedBy         User         @relation("InvitedBy", fields: [invitedByUserId], references: [id])
  acceptedBy        User?        @relation("AcceptedBy", fields: [acceptedByUserId], references: [id])

  @@index([companyId])
  @@index([inviteCode])
  @@index([email])
  @@index([expiresAt])
  @@map("company_invites")
}

// BackofficeAdmin - Platform administrators
model BackofficeAdmin {
  id            String          @id @default(uuid()) @db.Uuid
  firebaseUid   String          @unique @map("firebase_uid") @db.VarChar(128)
  email         String          @unique @db.VarChar(255)
  displayName   String          @map("display_name") @db.VarChar(100)
  role          BackofficeRole
  status        AdminStatus     @default(ACTIVE)
  lastLoginAt   DateTime?       @map("last_login_at") @db.Timestamptz
  createdBy     String?         @map("created_by") @db.Uuid
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime        @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt     DateTime?       @map("deleted_at") @db.Timestamptz

  @@index([email])
  @@index([role])
  @@map("backoffice_admins")
}

// AuthAuditLog - Immutable auth event log
model AuthAuditLog {
  id            String        @id @default(uuid()) @db.Uuid
  eventType     AuthEventType @map("event_type")
  userId        String?       @map("user_id") @db.Uuid
  adminId       String?       @map("admin_id") @db.Uuid
  targetUserId  String?       @map("target_user_id") @db.Uuid
  sessionId     String?       @map("session_id") @db.Uuid
  ipAddressHash String?       @map("ip_address_hash") @db.VarChar(64)
  userAgent     String?       @map("user_agent") @db.VarChar(500)
  deviceType    DeviceType    @default(UNKNOWN) @map("device_type")
  success       Boolean
  failureReason String?       @map("failure_reason") @db.VarChar(200)
  metadata      Json          @default("{}") @db.JsonB
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz

  @@index([userId])
  @@index([adminId])
  @@index([eventType])
  @@index([createdAt])
  @@index([userId, eventType, createdAt])
  @@map("auth_audit_logs")
}

// AccountLockout - Failed attempt tracking
model AccountLockout {
  id                   String    @id @default(uuid()) @db.Uuid
  email                String    @unique @db.VarChar(255)
  failedAttempts       Int       @default(0) @map("failed_attempts")
  lastFailedAt         DateTime? @map("last_failed_at") @db.Timestamptz
  lockedUntil          DateTime? @map("locked_until") @db.Timestamptz
  lockLevel            Int       @default(0) @map("lock_level")
  requiresEmailUnlock  Boolean   @default(false) @map("requires_email_unlock")
  unlockToken          String?   @map("unlock_token") @db.VarChar(100)
  unlockTokenExpiresAt DateTime? @map("unlock_token_expires_at") @db.Timestamptz
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  @@index([email])
  @@index([lockedUntil])
  @@map("account_lockouts")
}

// Enums
enum IdentityProvider {
  EMAIL
  GOOGLE
  APPLE
}

enum UserType {
  B2C
  B2B
}

enum UserStatus {
  PENDING_VERIFICATION
  PENDING_ONBOARDING
  ACTIVE
  SUSPENDED
  DELETED
}

enum B2BRole {
  EMPLOYEE
  TEAM_LEAD
  HR_MANAGER
  COMPANY_ADMIN
}

enum DeviceType {
  IOS
  ANDROID
  WEB
  UNKNOWN
}

enum SessionStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

enum SeniorityLevel {
  ENTRY
  JUNIOR
  MID
  SENIOR
  LEAD
  EXECUTIVE
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  SCALE
  TEXT
}

enum CompanyStatus {
  ACTIVE
  SUSPENDED
  CHURNED
}

enum InviteType {
  EMAIL
  LINK
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

enum BackofficeRole {
  SUPER_ADMIN
  CONTENT_MANAGER
  SUPPORT_AGENT
  B2B_MANAGER
  ANALYTICS_VIEWER
}

enum AdminStatus {
  ACTIVE
  SUSPENDED
}

enum AuthEventType {
  LOGIN_SUCCESS
  LOGIN_FAILURE
  LOGOUT
  SIGNUP_STARTED
  SIGNUP_COMPLETED
  PASSWORD_CHANGE
  PASSWORD_RESET_REQUEST
  PASSWORD_RESET_COMPLETE
  EMAIL_CHANGE_REQUEST
  EMAIL_CHANGE_COMPLETE
  SESSION_REVOKED
  ALL_SESSIONS_REVOKED
  B2B_JOIN
  B2B_LEAVE
  ACCOUNT_SUSPENDED
  ACCOUNT_REACTIVATED
  ACCOUNT_DELETE_REQUEST
  ACCOUNT_DELETED
  ADMIN_IMPERSONATE_START
  ADMIN_IMPERSONATE_END
  ONBOARDING_COMPLETED
  ONBOARDING_UPDATED
  GUEST_MERGE_COMPLETED
}

```

### Entity Relationships

```mermaid
erDiagram
    User ||--o{ UserSession : "has many"
    User ||--o{ OnboardingAnswer : "provides"
    User }o--|| Persona : "assigned to"
    User }o--o| Company : "belongs to"
    User }o--o| Guest : "merged from"

    Company ||--o{ User : "employs"
    Company ||--o{ CompanyInvite : "has"

    CompanyInvite }o--|| User : "invited by"
    CompanyInvite }o--o| User : "accepted by"

    OnboardingQuestion ||--o{ OnboardingAnswer : "answered by"

    Guest }o--o| User : "merged to"

```

### Data Constraints

```yaml
constraints:

  User:
    business_rules:
      - "email must be unique (case-insensitive, stored lowercase)"
      - "B2B user must have company_id and b2b_role set"
      - "B2C user must have company_id and b2b_role as NULL"
      - "ACTIVE status requires onboarding_completed_at"
      - "firebase_uid is immutable after creation"
      - "Maximum one company membership at a time"
    validation:
      - {field: email, rule: "valid email format, max 255 chars, lowercase", message: "Invalid email format"}
      - {field: displayName, rule: "max 100 chars, no control characters", message: "Invalid display name"}
      - {field: preferredLanguage, rule: "ISO 639-1 code", message: "Invalid language code"}
      - {field: timezone, rule: "IANA timezone", message: "Invalid timezone"}
    soft_delete: true
    audit_log: true

  Guest:
    business_rules:
      - "expires_at = created_at + 90 days"
      - "merged guest cannot be merged again"
      - "merged_at required when merged_to_user_id set"
    validation:
      - {field: deviceFingerprint, rule: "max 255 chars", message: "Invalid device fingerprint"}
    soft_delete: false
    audit_log: false

  UserSession:
    business_rules:
      - "Maximum 5 ACTIVE sessions per user"
      - "REVOKED session must have revoked_at"
      - "expires_at must be in future at creation"
    validation:
      - {field: firebaseTokenId, rule: "non-empty", message: "Token ID required"}
    soft_delete: false
    audit_log: true

  Company:
    business_rules:
      - "current_seat_count must not exceed seat_limit"
      - "SUSPENDED company cannot accept new members"
      - "slug must be URL-safe"
    validation:
      - {field: name, rule: "max 200 chars", message: "Company name too long"}
      - {field: slug, rule: "lowercase alphanumeric + hyphen, max 100", message: "Invalid slug format"}
      - {field: seatLimit, rule: "positive integer", message: "Invalid seat limit"}
    soft_delete: true
    audit_log: true

  CompanyInvite:
    business_rules:
      - "EMAIL type must have email set"
      - "LINK type should have max_uses set"
      - "current_uses must not exceed max_uses"
      - "Cannot accept EXPIRED or CANCELLED invite"
      - "ACCEPTED invite must have accepted_by_user_id and accepted_at"
    validation:
      - {field: email, rule: "valid email format when present", message: "Invalid email"}
      - {field: inviteCode, rule: "alphanumeric, 10-50 chars", message: "Invalid invite code"}
    soft_delete: false
    audit_log: true

  AuthAuditLog:
    business_rules:
      - "Immutable - no updates or deletes"
      - "LOGIN_FAILURE should have failure_reason"
      - "ADMIN_IMPERSONATE events must have admin_id and target_user_id"
    validation: []
    soft_delete: false
    audit_log: false

```

---

## API_SPECIFICATION

### Endpoints Overview

```yaml
base_path: /api/v1

endpoint_groups:
  auth:
    base: /auth
    endpoints:
      - {method: POST, path: /signup, purpose: "Email signup"}
      - {method: POST, path: /login, purpose: "Login with Firebase token"}
      - {method: POST, path: /logout, purpose: "Logout current session"}
      - {method: POST, path: /logout-all, purpose: "Logout all sessions"}
      - {method: POST, path: /refresh, purpose: "Refresh custom claims"}
      - {method: GET, path: /me, purpose: "Get current user"}
      - {method: PUT, path: /me, purpose: "Update current user profile"}
      - {method: POST, path: /password-reset/request, purpose: "Request password reset"}
      - {method: POST, path: /password-reset/complete, purpose: "Complete password reset"}
      - {method: POST, path: /email-change/request, purpose: "Request email change"}
      - {method: POST, path: /email-change/confirm, purpose: "Confirm email change"}
      - {method: POST, path: /delete-account, purpose: "Request account deletion"}

  guest:
    base: /guest
    endpoints:
      - {method: POST, path: /, purpose: "Create or get guest"}
      - {method: PUT, path: /activity, purpose: "Update guest activity"}

  sessions:
    base: /sessions
    endpoints:
      - {method: GET, path: /, purpose: "List active sessions"}
      - {method: DELETE, path: /:id, purpose: "Revoke specific session"}

  onboarding:
    base: /onboarding
    endpoints:
      - {method: GET, path: /questions, purpose: "Get onboarding questions"}
      - {method: POST, path: /submit, purpose: "Submit onboarding answers"}
      - {method: PUT, path: /update, purpose: "Update onboarding answers"}

  b2b:
    base: /b2b
    endpoints:
      - {method: GET, path: /invite/:code, purpose: "Get invite details"}
      - {method: POST, path: /invite/accept, purpose: "Accept invite"}
      - {method: POST, path: /invite, purpose: "Create invite (admin)"}
      - {method: POST, path: /invite/bulk, purpose: "Bulk create invites (admin)"}
      - {method: DELETE, path: /invite/:id, purpose: "Cancel invite (admin)"}
      - {method: GET, path: /invites, purpose: "List company invites (admin)"}
      - {method: POST, path: /leave, purpose: "Leave company"}
      - {method: GET, path: /members, purpose: "List company members (admin)"}
      - {method: PUT, path: /members/:id/role, purpose: "Update member role (admin)"}
      - {method: DELETE, path: /members/:id, purpose: "Remove member (admin)"}

  admin:
    base: /admin
    endpoints:
      - {method: GET, path: /users, purpose: "List/search users"}
      - {method: GET, path: /users/:id, purpose: "Get user details"}
      - {method: POST, path: /users/:id/suspend, purpose: "Suspend user"}
      - {method: POST, path: /users/:id/reactivate, purpose: "Reactivate user"}
      - {method: POST, path: /users/:id/impersonate, purpose: "Start impersonation"}
      - {method: POST, path: /impersonate/end, purpose: "End impersonation"}
      - {method: GET, path: /audit-logs, purpose: "Query audit logs"}

```

### Endpoint Details

### POST /api/v1/auth/signup

```yaml
endpoint:
  method: POST
  path: /api/v1/auth/signup
  summary: "Register new user with email and password"
  auth: none
  rate_limit: "5 requests per minute per IP"

```

```yaml
# Request
headers:
  Content-Type: application/json
  X-Guest-ID: "{guest_uuid}"  # Optional - for merge

body:
  type: object
  required: [email, password]
  properties:
    email:
      type: string
      format: email
      maxLength: 255
      description: "User email address"
      example: "user@example.com"
    password:
      type: string
      minLength: 8
      maxLength: 128
      description: "User password (min 8 chars)"
      example: "SecurePass123"
    displayName:
      type: string
      maxLength: 100
      description: "Optional display name"
      example: "John Doe"
    preferredLanguage:
      type: string
      default: "en"
      description: "ISO 639-1 language code"
      example: "en"

```

```yaml
# Response 201 Created
body:
  type: object
  properties:
    data:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        displayName:
          type: string
        status:
          type: string
          enum: [PENDING_VERIFICATION]
        userType:
          type: string
          enum: [B2C]
        needsEmailVerification:
          type: boolean
          example: true
        guestMerged:
          type: boolean
          description: "Whether guest data was merged"
    meta:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        requestId:
          type: string
          format: uuid

```

```yaml
# Error Responses
errors:
  - status: 400
    code: AUTH_VALIDATION_ERROR
    condition: "Invalid email format or weak password"
    body:
      error:
        code: "AUTH_VALIDATION_ERROR"
        message: "Validation failed"
        details:
          - field: "password"
            reason: "Password must be at least 8 characters"

  - status: 409
    code: AUTH_EMAIL_EXISTS
    condition: "Email already registered"
    body:
      error:
        code: "AUTH_EMAIL_EXISTS"
        message: "Email already registered"
        details:
          suggestion: "Try logging in or reset your password"

  - status: 422
    code: AUTH_PASSWORD_BREACHED
    condition: "Password found in breach database"
    body:
      error:
        code: "AUTH_PASSWORD_BREACHED"
        message: "This password has been compromised in a data breach"
        details:
          suggestion: "Please choose a different password"

  - status: 429
    code: RATE_LIMIT_EXCEEDED
    condition: "Too many signup attempts"

  - status: 503
    code: AUTH_PROVIDER_UNAVAILABLE
    condition: "Firebase unavailable"

```

### POST /api/v1/auth/login

```yaml
endpoint:
  method: POST
  path: /api/v1/auth/login
  summary: "Authenticate with Firebase ID token"
  auth: none (Firebase token in body)
  rate_limit: "10 requests per minute per IP"

```

```yaml
# Request
headers:
  Content-Type: application/json

body:
  type: object
  required: [idToken]
  properties:
    idToken:
      type: string
      description: "Firebase ID token from client auth"
    deviceType:
      type: string
      enum: [IOS, ANDROID, WEB]
      default: WEB
    deviceName:
      type: string
      maxLength: 100
      description: "Human-readable device name"
      example: "iPhone 15 Pro"
    deviceId:
      type: string
      maxLength: 255
      description: "Unique device identifier (hashed)"
    rememberMe:
      type: boolean
      default: true
      description: "Extended session duration"

```

```yaml
# Response 200 OK
body:
  type: object
  properties:
    data:
      type: object
      properties:
        user:
          type: object
          properties:
            id:
              type: string
              format: uuid
            email:
              type: string
            displayName:
              type: string
            avatarUrl:
              type: string
            status:
              type: string
              enum: [PENDING_ONBOARDING, ACTIVE]
            userType:
              type: string
              enum: [B2C, B2B]
            persona:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                code:
                  type: string
                name:
                  type: string
            company:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                name:
                  type: string
                role:
                  type: string
        session:
          type: object
          properties:
            id:
              type: string
              format: uuid
            expiresAt:
              type: string
              format: date-time
        customClaims:
          type: object
          properties:
            userType:
              type: string
            subscriptionTier:
              type: string
            companyId:
              type: string
              nullable: true
            b2bRole:
              type: string
              nullable: true
        needsOnboarding:
          type: boolean
    meta:
      type: object
      properties:
        timestamp:
          type: string
        requestId:
          type: string

```

```yaml
# Error Responses
errors:
  - status: 401
    code: AUTH_TOKEN_INVALID
    condition: "Invalid or expired Firebase token"

  - status: 403
    code: AUTH_ACCOUNT_SUSPENDED
    condition: "Account suspended"
    body:
      error:
        code: "AUTH_ACCOUNT_SUSPENDED"
        message: "Your account has been suspended"
        details:
          reason: "Policy violation"
          contactSupport: true

  - status: 423
    code: AUTH_ACCOUNT_LOCKED
    condition: "Account locked due to failed attempts"
    body:
      error:
        code: "AUTH_ACCOUNT_LOCKED"
        message: "Account temporarily locked"
        details:
          lockedUntil: "2024-01-01T12:30:00Z"
          unlockMethod: "wait" | "email"

  - status: 429
    code: RATE_LIMIT_EXCEEDED
    condition: "Too many login attempts"

```

### GET /api/v1/auth/me

```yaml
endpoint:
  method: GET
  path: /api/v1/auth/me
  summary: "Get current authenticated user"
  auth: required
  roles: [any authenticated user]

```

```yaml
# Request
headers:
  Authorization: Bearer {firebase_id_token}

```

```yaml
# Response 200 OK
body:
  type: object
  properties:
    data:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        emailVerified:
          type: boolean
        displayName:
          type: string
        avatarUrl:
          type: string
        status:
          type: string
        userType:
          type: string
        preferredLanguage:
          type: string
        timezone:
          type: string
        persona:
          type: object
          nullable: true
        company:
          type: object
          nullable: true
        onboardingCompleted:
          type: boolean
        createdAt:
          type: string
          format: date-time

```

### POST /api/v1/guest

```yaml
endpoint:
  method: POST
  path: /api/v1/guest
  summary: "Create or retrieve guest identity"
  auth: none
  rate_limit: "20 requests per minute per IP"

```

```yaml
# Request
headers:
  Content-Type: application/json

body:
  type: object
  properties:
    deviceFingerprint:
      type: string
      maxLength: 255
      description: "Hashed device identifier"
    deviceType:
      type: string
      enum: [IOS, ANDROID, WEB]
      required: true
    appVersion:
      type: string
      maxLength: 20

```

```yaml
# Response 200 OK (existing guest) / 201 Created (new guest)
body:
  type: object
  properties:
    data:
      type: object
      properties:
        id:
          type: string
          format: uuid
        isNew:
          type: boolean
        expiresAt:
          type: string
          format: date-time

```

### GET /api/v1/onboarding/questions

```yaml
endpoint:
  method: GET
  path: /api/v1/onboarding/questions
  summary: "Get active onboarding questions"
  auth: required
  roles: [users with PENDING_ONBOARDING status]

```

```yaml
# Response 200 OK
body:
  type: object
  properties:
    data:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
            format: uuid
          code:
            type: string
          questionText:
            type: string
          questionType:
            type: string
            enum: [SINGLE_CHOICE, MULTIPLE_CHOICE, SCALE, TEXT]
          options:
            type: array
            nullable: true
            items:
              type: object
              properties:
                code:
                  type: string
                text:
                  type: string
          isRequired:
            type: boolean
          displayOrder:
            type: integer

```

### POST /api/v1/onboarding/submit

```yaml
endpoint:
  method: POST
  path: /api/v1/onboarding/submit
  summary: "Submit onboarding answers and complete onboarding"
  auth: required
  roles: [users with PENDING_ONBOARDING status]

```

```yaml
# Request
body:
  type: object
  required: [answers]
  properties:
    answers:
      type: array
      items:
        type: object
        required: [questionId, value]
        properties:
          questionId:
            type: string
            format: uuid
          value:
            oneOf:
              - type: object
                properties:
                  selected:
                    type: string
              - type: object
                properties:
                  selected:
                    type: array
                    items:
                      type: string
              - type: object
                properties:
                  scale:
                    type: integer
                    minimum: 1
                    maximum: 10
              - type: object
                properties:
                  text:
                    type: string

```

```yaml
# Response 200 OK
body:
  type: object
  properties:
    data:
      type: object
      properties:
        user:
          type: object
          properties:
            id:
              type: string
            status:
              type: string
              example: "ACTIVE"
            persona:
              type: object
              properties:
                id:
                  type: string
                code:
                  type: string
                name:
                  type: string
                description:
                  type: string
        onboardingCompletedAt:
          type: string
          format: date-time

```

### POST /api/v1/b2b/invite/accept

```yaml
endpoint:
  method: POST
  path: /api/v1/b2b/invite/accept
  summary: "Accept B2B company invite"
  auth: required
  roles: [B2C users or unauthenticated new users]

```

```yaml
# Request
body:
  type: object
  required: [inviteCode]
  properties:
    inviteCode:
      type: string
      description: "Invite code from email or link"

```

```yaml
# Response 200 OK
body:
  type: object
  properties:
    data:
      type: object
      properties:
        user:
          type: object
          properties:
            id:
              type: string
            userType:
              type: string
              example: "B2B"
            company:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
            b2bRole:
              type: string
            b2bJoinedAt:
              type: string
              format: date-time
        customClaims:
          type: object
          description: "Updated custom claims"

```

```yaml
# Error Responses
errors:
  - status: 404
    code: B2B_INVITE_NOT_FOUND
    condition: "Invalid invite code"

  - status: 410
    code: B2B_INVITE_EXPIRED
    condition: "Invite has expired"

  - status: 410
    code: B2B_INVITE_CANCELLED
    condition: "Invite was cancelled"

  - status: 403
    code: B2B_SEAT_LIMIT_REACHED
    condition: "Company has no available seats"

  - status: 409
    code: B2B_ALREADY_MEMBER
    condition: "User already belongs to a company"

```

---

## EVENT_SPECIFICATION

### Events Produced

```yaml
events_produced:

  auth.signup.completed:
    trigger: "User successfully completes signup"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid, description: "New user ID"}
        email: {type: string, description: "User email (masked in logs)"}
        identityProvider: {type: string, enum: [EMAIL, GOOGLE, APPLE]}
        userType: {type: string, enum: [B2C]}
        deviceType: {type: string, enum: [IOS, ANDROID, WEB]}
    consumers: [analytics-service, email-service, recommendation-engine]
    example:
      eventId: "evt_123"
      eventType: "auth.signup.completed"
      timestamp: "2024-01-01T12:00:00Z"
      source: "user-auth"
      correlationId: "req_456"
      data:
        userId: "usr_789"
        email: "j***@example.com"
        identityProvider: "EMAIL"
        userType: "B2C"
        deviceType: "IOS"

  auth.login.completed:
    trigger: "User successfully logs in"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        sessionId: {type: string, format: uuid}
        deviceType: {type: string}
        isNewDevice: {type: boolean}
    consumers: [analytics-service]

  auth.guest.merged:
    trigger: "Guest data merged to user account"
    payload:
      type: object
      properties:
        guestId: {type: string, format: uuid, description: "Original guest ID"}
        userId: {type: string, format: uuid, description: "New user ID"}
        deviceType: {type: string}
    consumers: [mobile-feature-module]
    example:
      eventId: "evt_124"
      eventType: "auth.guest.merged"
      timestamp: "2024-01-01T12:00:00Z"
      source: "user-auth"
      correlationId: "req_456"
      data:
        guestId: "gst_111"
        userId: "usr_789"
        deviceType: "IOS"

  auth.onboarding.completed:
    trigger: "User completes mandatory onboarding"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        personaId: {type: string, format: uuid}
        personaCode: {type: string}
    consumers: [recommendation-engine, gamification-service]
    example:
      eventId: "evt_125"
      eventType: "auth.onboarding.completed"
      timestamp: "2024-01-01T12:05:00Z"
      source: "user-auth"
      correlationId: "req_457"
      data:
        userId: "usr_789"
        personaId: "per_001"
        personaCode: "RISING_LEADER"

  auth.onboarding.updated:
    trigger: "User updates onboarding answers"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        previousPersonaId: {type: string, format: uuid}
        newPersonaId: {type: string, format: uuid}
        newPersonaCode: {type: string}
    consumers: [recommendation-engine]

  auth.b2b.joined:
    trigger: "User joins B2B company"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        companyId: {type: string, format: uuid}
        companyName: {type: string}
        role: {type: string, enum: [EMPLOYEE, TEAM_LEAD, HR_MANAGER, COMPANY_ADMIN]}
        inviteId: {type: string, format: uuid}
    consumers: [b2b-feature-module, notification-service]
    example:
      eventId: "evt_126"
      eventType: "auth.b2b.joined"
      timestamp: "2024-01-01T12:10:00Z"
      source: "user-auth"
      data:
        userId: "usr_789"
        companyId: "cmp_001"
        companyName: "Acme Corp"
        role: "EMPLOYEE"
        inviteId: "inv_555"

  auth.b2b.left:
    trigger: "User leaves B2B company"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        companyId: {type: string, format: uuid}
        reason: {type: string, enum: [USER_LEFT, REMOVED_BY_ADMIN, COMPANY_CHURNED]}
    consumers: [b2b-feature-module, notification-service]

  auth.b2b.role_changed:
    trigger: "User's B2B role is updated"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        companyId: {type: string, format: uuid}
        previousRole: {type: string}
        newRole: {type: string}
        changedByUserId: {type: string, format: uuid}
    consumers: [b2b-feature-module]

  auth.user.suspended:
    trigger: "User account suspended"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        reason: {type: string}
        suspendedByAdminId: {type: string, format: uuid}
    consumers: [notification-service]

  auth.user.reactivated:
    trigger: "Suspended user reactivated"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        reactivatedByAdminId: {type: string, format: uuid}
    consumers: [notification-service]

  auth.user.deleted:
    trigger: "User account hard deleted (after 30 days)"
    payload:
      type: object
      properties:
        userIdHash: {type: string, description: "Hashed user ID for reference"}
    consumers: [all-modules]

  auth.session.revoked:
    trigger: "Session explicitly revoked"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        sessionId: {type: string, format: uuid}
        reason: {type: string}
    consumers: [analytics-service]

  auth.password.changed:
    trigger: "User changes password"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
    consumers: [notification-service]

  auth.email.changed:
    trigger: "User changes email"
    payload:
      type: object
      properties:
        userId: {type: string, format: uuid}
        previousEmailHash: {type: string}
        newEmailHash: {type: string}
    consumers: [notification-service]

```

### Events Consumed

```yaml
events_consumed:

  billing.subscription.changed:
    source: "billing-module (future)"
    handler: "AuthService.handleSubscriptionChange"
    action: "Update user's custom claims with new subscription tier"
    idempotency: "Check lastUpdated timestamp, skip if older"
    failure_handling: "Retry 3x with exponential backoff, alert on failure"

  billing.company_plan.changed:
    source: "billing-module (future)"
    handler: "B2BService.handleCompanyPlanChange"
    action: "Update company seat_limit based on plan"
    idempotency: "Check plan version, skip if same or older"
    failure_handling: "Retry 3x, manual intervention if persistent failure"

```

---

## NFR (Non-Functional Requirements)

### Module Level

```yaml
performance:
  response_time:
    p50: "50ms"
    p95: "150ms"
    p99: "300ms"
  throughput: "500 RPS (login endpoint)"
  notes: "Firebase token verification adds ~50ms latency"

scalability:
  horizontal: true
  max_instances: 10
  scaling_trigger: "CPU > 70% OR request queue > 100"
  stateless: true
  session_storage: "Database (not in-memory)"

availability:
  sla: "99.9%"
  graceful_degradation:
    - "Firebase unavailable: Return 503 with retry-after header"
    - "Database unavailable: Cached session validation for read-only operations"
    - "Redis unavailable: Fall back to database for rate limiting (degraded)"

security:
  authentication: "Firebase ID Token (JWT)"
  authorization: "Role-based (B2B roles, Backoffice roles)"
  data_encryption:
    at_rest: "PostgreSQL native encryption"
    in_transit: "TLS 1.3"
  sensitive_fields:
    - "email (PII)"
    - "displayName (PII)"
    - "ipAddress (PII - stored hashed)"
    - "inviteCode (confidential)"
  password_policy:
    min_length: 8
    max_length: 128
    complexity: "Not required (NIST recommendation)"
    breach_check: "HaveIBeenPwned API"
  rate_limiting:
    login: "10/minute/IP"
    signup: "5/minute/IP"
    password_reset: "3/hour/email"

observability:
  logging:
    level: "info (production), debug (staging)"
    required_fields:
      - "timestamp"
      - "correlationId"
      - "userId (when available)"
      - "action"
      - "duration"
    sensitive_redaction:
      - "email → j***@example.com"
      - "password → [REDACTED]"
      - "idToken → [REDACTED]"
      - "ipAddress → [HASHED]"
  metrics:
    - auth_signup_total: "Counter - signup attempts"
    - auth_signup_success_total: "Counter - successful signups"
    - auth_login_total: "Counter - login attempts"
    - auth_login_success_total: "Counter - successful logins"
    - auth_login_duration_seconds: "Histogram - login latency"
    - auth_session_active_count: "Gauge - active sessions"
    - auth_lockout_total: "Counter - account lockouts"
    - auth_guest_merge_total: "Counter - guest merges"
    - auth_b2b_join_total: "Counter - B2B joins"
  alerts:
    - {condition: "auth_login_success_rate < 0.95 for 5m", severity: "warning"}
    - {condition: "auth_login_success_rate < 0.80 for 5m", severity: "critical"}
    - {condition: "auth_lockout_total > 50 in 1h", severity: "warning"}
    - {condition: "auth_login_duration_p99 > 500ms for 5m", severity: "warning"}
    - {condition: "firebase_api_errors > 10 in 5m", severity: "critical"}

```

---

## IMPLEMENTATION_PHASES

```yaml
phases_overview:
  - {phase: 1, name: "Foundation", focus: "Database schema, Prisma setup, base entities", duration: "Week 1"}
  - {phase: 2, name: "Core Auth Services", focus: "Firebase integration, signup, login, session management", duration: "Week 2"}
  - {phase: 3, name: "Onboarding & Guest", focus: "Guest tracking, onboarding flow, persona assignment", duration: "Week 3"}
  - {phase: 4, name: "B2B & Admin", focus: "Company membership, invites, backoffice operations", duration: "Week 4"}
  - {phase: 5, name: "Security & Polish", focus: "Lockout, audit logging, error handling, optimization", duration: "Week 5-6"}

```

### Story Dependency Graph

```mermaid
graph TD
    subgraph "Phase 1: Foundation"
        S1.1.1[S1.1.1: User Entity]
        S1.1.2[S1.1.2: Guest Entity]
        S1.1.3[S1.1.3: Session Entity]
        S1.1.4[S1.1.4: Persona & Onboarding Entities]
        S1.1.5[S1.1.5: Company & Invite Entities]
        S1.1.6[S1.1.6: Admin & Audit Entities]
        S1.1.7[S1.1.7: Lockout Entity]
    end

    subgraph "Phase 2: Core Auth"
        S2.1.1[S2.1.1: Firebase Service]
        S2.1.2[S2.1.2: Auth Service - Signup]
        S2.1.3[S2.1.3: Auth Service - Login]
        S2.1.4[S2.1.4: Session Service]
        S2.1.5[S2.1.5: Auth Controller]
        S2.1.6[S2.1.6: Session Controller]
        S2.1.7[S2.1.7: JWT Guard & Strategy]
    end

    subgraph "Phase 3: Onboarding & Guest"
        S3.1.1[S3.1.1: Guest Service]
        S3.1.2[S3.1.2: Guest Controller]
        S3.1.3[S3.1.3: Onboarding Service]
        S3.1.4[S3.1.4: Persona Service]
        S3.1.5[S3.1.5: Onboarding Controller]
        S3.1.6[S3.1.6: Guest Merge Flow]
    end

    subgraph "Phase 4: B2B & Admin"
        S4.1.1[S4.1.1: B2B Service]
        S4.1.2[S4.1.2: Invite Management]
        S4.1.3[S4.1.3: B2B Controller]
        S4.1.4[S4.1.4: Admin Service]
        S4.1.5[S4.1.5: Admin Controller]
        S4.1.6[S4.1.6: Impersonation]
    end

    subgraph "Phase 5: Security & Polish"
        S5.1.1[S5.1.1: Lockout Service]
        S5.1.2[S5.1.2: Audit Service]
        S5.1.3[S5.1.3: Rate Limiting]
        S5.1.4[S5.1.4: Error Handling]
        S5.1.5[S5.1.5: Logging & Metrics]
        S5.1.6[S5.1.6: Event Publishing]
        S5.1.7[S5.1.7: Scheduled Jobs]
    end

    %% Phase 1 Dependencies
    S1.1.1 --> S1.1.2
    S1.1.1 --> S1.1.3
    S1.1.1 --> S1.1.4
    S1.1.1 --> S1.1.5
    S1.1.1 --> S1.1.6
    S1.1.1 --> S1.1.7

    %% Phase 2 Dependencies
    S1.1.1 --> S2.1.1
    S1.1.3 --> S2.1.4
    S2.1.1 --> S2.1.2
    S2.1.1 --> S2.1.3
    S2.1.4 --> S2.1.3
    S2.1.2 --> S2.1.5
    S2.1.3 --> S2.1.5
    S2.1.4 --> S2.1.6
    S2.1.1 --> S2.1.7

    %% Phase 3 Dependencies
    S1.1.2 --> S3.1.1
    S3.1.1 --> S3.1.2
    S1.1.4 --> S3.1.3
    S1.1.4 --> S3.1.4
    S3.1.3 --> S3.1.5
    S3.1.4 --> S3.1.5
    S3.1.1 --> S3.1.6
    S2.1.2 --> S3.1.6

    %% Phase 4 Dependencies
    S1.1.5 --> S4.1.1
    S4.1.1 --> S4.1.2
    S4.1.2 --> S4.1.3
    S1.1.6 --> S4.1.4
    S4.1.4 --> S4.1.5
    S4.1.4 --> S4.1.6
    S2.1.4 --> S4.1.6

    %% Phase 5 Dependencies
    S1.1.7 --> S5.1.1
    S1.1.6 --> S5.1.2
    S2.1.5 --> S5.1.3
    S2.1.5 --> S5.1.4
    S5.1.4 --> S5.1.5
    S2.1.2 --> S5.1.6
    S3.1.1 --> S5.1.7

```

### Parallel Execution Guide

```yaml
parallel_groups:

  group_1:
    stories: [S1.1.1]
    after: []
    note: "Start here - User entity is foundation for all"

  group_2:
    stories: [S1.1.2, S1.1.3, S1.1.4, S1.1.5, S1.1.6, S1.1.7]
    after: [S1.1.1]
    note: "All other entities can be created in parallel after User"

  group_3:
    stories: [S2.1.1, S2.1.4]
    after: [S1.1.1, S1.1.3]
    note: "Firebase Service and Session Service can start together"

  group_4:
    stories: [S2.1.2, S2.1.3, S2.1.7]
    after: [S2.1.1]
    note: "Auth operations depend on Firebase Service"

  group_5:
    stories: [S2.1.5, S2.1.6]
    after: [S2.1.2, S2.1.3, S2.1.4]
    note: "Controllers after services are ready"

  group_6:
    stories: [S3.1.1, S3.1.3, S3.1.4]
    after: [S1.1.2, S1.1.4]
    note: "Guest and Onboarding services can parallelize"

  group_7:
    stories: [S3.1.2, S3.1.5, S3.1.6]
    after: [S3.1.1, S3.1.3, S3.1.4]
    note: "Controllers and merge flow after services"

  group_8:
    stories: [S4.1.1, S4.1.4]
    after: [S1.1.5, S1.1.6]
    note: "B2B and Admin services can parallelize"

  group_9:
    stories: [S4.1.2, S4.1.3, S4.1.5, S4.1.6]
    after: [S4.1.1, S4.1.4]
    note: "B2B and Admin features after base services"

  group_10:
    stories: [S5.1.1, S5.1.2, S5.1.3]
    after: [S1.1.7, S1.1.6, S2.1.5]
    note: "Security services can parallelize"

  group_11:
    stories: [S5.1.4, S5.1.5, S5.1.6, S5.1.7]
    after: [S5.1.1, S5.1.2, S5.1.3]
    note: "Final polish after security services"

```

---

## PHASE_1_FOUNDATION

### Epic 1.1: Database Schema Setup

```yaml
epic:
  id: E1.1
  name: "Database Schema Setup"
  goal: "Establish complete data layer with all entities, relations, and indexes"
  dependencies: none
  duration: "3-4 days"

```

### Story 1.1.1: Create User Entity Schema

```yaml
story:
  id: S1.1.1
  name: "Create User Entity Schema"
  description: >
    Create the core User entity with all fields, enums, indexes, and constraints.
    This is the foundation entity that all other entities reference.

  flow_ref: "USER_FLOWS.email_signup.step_2"
  depends_on: []
  effort: medium

  technical_spec:
    what: |
      - Create User model in Prisma schema
      - Create all related enums (IdentityProvider, UserType, UserStatus, B2BRole)
      - Add indexes for common query patterns
      - Create initial migration
    how:
      - Define User model with all 25+ fields from DB Plan
      - Create enum definitions
      - Add @@index annotations for email, companyId, status, userType, createdAt, personaId
      - Add @@unique constraints for firebaseUid, email with soft delete condition
      - Run prisma migrate dev to generate migration
      - Verify migration applies cleanly
    constraints:
      - Use UUID v7 for id (application-generated)
      - All timestamps must be timestamptz (UTC)
      - Email must be stored lowercase (add Prisma middleware)
      - Soft delete pattern with deletedAt field

  acceptance_criteria:
    happy_path:
      - given: "Empty database"
        when: "Migration runs"
        then: "users table created with all columns, indexes, and constraints"
    edge_cases:
      - "Duplicate email insert → unique constraint violation"
      - "B2B user without company_id → check constraint violation (application level)"
    checklist:
      - [ ] User model defined in schema.prisma
      - [ ] All enums (IdentityProvider, UserType, UserStatus, B2BRole) defined
      - [ ] Primary key is UUID
      - [ ] All 25+ fields from DB Plan present
      - [ ] Indexes created for: email, companyId, status, userType, createdAt, personaId
      - [ ] Unique constraints on firebaseUid, email
      - [ ] Migration file generated
      - [ ] Migration applies without errors
      - [ ] Prisma Client generates successfully
      - [ ] Email lowercase middleware created

  nfr:
    - "Migration must complete in < 5 seconds on empty database"

```

### Story 1.1.2: Create Guest Entity Schema

```yaml
story:
  id: S1.1.2
  name: "Create Guest Entity Schema"
  description: >
    Create Guest entity for anonymous user tracking with merge capability.

  flow_ref: "USER_FLOWS.guest_creation.step_2"
  depends_on: [S1.1.1]
  effort: small

  technical_spec:
    what: |
      - Create Guest model in Prisma schema
      - Add DeviceType enum
      - Create relation to User (merged_to)
      - Add indexes for lookup and cleanup
    how:
      - Define Guest model with 11 fields from DB Plan
      - Create DeviceType enum (IOS, ANDROID, WEB, UNKNOWN)
      - Add relation to User for mergedToUserId
      - Add @@index for deviceFingerprint, expiresAt, mergedToUserId
      - Add partial unique on deviceFingerprint where not merged
      - Generate and apply migration
    constraints:
      - expiresAt calculated as createdAt + 90 days
      - No soft delete (hard delete after expiry)

  acceptance_criteria:
    happy_path:
      - given: "Database with users table"
        when: "Migration runs"
        then: "guests table created with proper FK to users"
    edge_cases:
      - "Insert guest with duplicate fingerprint (not merged) → unique violation"
      - "Insert guest with duplicate fingerprint (already merged) → allowed"
    checklist:
      - [ ] Guest model defined
      - [ ] DeviceType enum defined
      - [ ] Relation to User established
      - [ ] All indexes created
      - [ ] Partial unique constraint on deviceFingerprint
      - [ ] Migration applies successfully

```

### Story 1.1.3: Create Session Entity Schema

```yaml
story:
  id: S1.1.3
  name: "Create UserSession Entity Schema"
  description: >
    Create UserSession entity for tracking active authentication sessions.

  flow_ref: "USER_FLOWS.login.step_3"
  depends_on: [S1.1.1]
  effort: small

  technical_spec:
    what: |
      - Create UserSession model
      - Add SessionStatus enum
      - Create relation to User with cascade delete
      - Add indexes for session management queries
    how:
      - Define UserSession model with 15 fields from DB Plan
      - Create SessionStatus enum (ACTIVE, EXPIRED, REVOKED)
      - Add relation to User with onDelete: Cascade
      - Add @@index for userId, userId+status, expiresAt
      - Add partial unique on firebaseTokenId where ACTIVE
      - Generate and apply migration
    constraints:
      - Maximum 5 active sessions enforced at application level
      - Sessions cascade delete when user deleted

  acceptance_criteria:
    happy_path:
      - given: "Database with users table"
        when: "Migration runs"
        then: "user_sessions table created with FK to users"
    edge_cases:
      - "Delete user → all sessions cascade deleted"
    checklist:
      - [ ] UserSession model defined
      - [ ] SessionStatus enum defined
      - [ ] Cascade delete configured
      - [ ] All indexes created
      - [ ] Migration applies successfully

```

### Story 1.1.4: Create Persona & Onboarding Entities Schema

```yaml
story:
  id: S1.1.4
  name: "Create Persona, OnboardingQuestion, OnboardingAnswer Schemas"
  description: >
    Create entities for persona management and onboarding flow.

  flow_ref: "USER_FLOWS.onboarding_completion.step_1"
  depends_on: [S1.1.1]
  effort: medium

  technical_spec:
    what: |
      - Create Persona model
      - Create OnboardingQuestion model
      - Create OnboardingAnswer model
      - Add SeniorityLevel, QuestionType enums
      - Create relations between entities
    how:
      - Define Persona with 11 fields, unique code
      - Define OnboardingQuestion with 10 fields, JSONB for options
      - Define OnboardingAnswer with 8 fields, JSONB for answerValue
      - Add SeniorityLevel enum (ENTRY through EXECUTIVE)
      - Add QuestionType enum (SINGLE_CHOICE, MULTIPLE_CHOICE, SCALE, TEXT)
      - Add relations: User→Persona, User→OnboardingAnswer, OnboardingQuestion→OnboardingAnswer
      - Add composite unique on OnboardingAnswer (userId, questionId) where isCurrent
      - Generate and apply migration
    constraints:
      - Persona code is immutable after users assigned
      - OnboardingAnswer uses versioning pattern (isCurrent flag)

  acceptance_criteria:
    happy_path:
      - given: "Database with users table"
        when: "Migration runs"
        then: "personas, onboarding_questions, onboarding_answers tables created"
    edge_cases:
      - "Multiple answers for same user+question with isCurrent=true → constraint violation"
    checklist:
      - [ ] Persona model defined with unique code
      - [ ] OnboardingQuestion model defined with JSONB options
      - [ ] OnboardingAnswer model defined with versioning fields
      - [ ] All enums defined (SeniorityLevel, QuestionType)
      - [ ] Relations established correctly
      - [ ] Composite unique constraint on answers
      - [ ] Migration applies successfully

```

### Story 1.1.5: Create Company & Invite Entities Schema

```yaml
story:
  id: S1.1.5
  name: "Create Company and CompanyInvite Schemas"
  description: >
    Create B2B entities for company management and invite system.

  flow_ref: "USER_FLOWS.b2b_invite_acceptance.step_1"
  depends_on: [S1.1.1]
  effort: medium

  technical_spec:
    what: |
      - Create Company model
      - Create CompanyInvite model
      - Add CompanyStatus, InviteType, InviteStatus enums
      - Create relations between Company, Invite, and User
    how:
      - Define Company with 12 fields, JSONB for settings
      - Define CompanyInvite with 18 fields
      - Add CompanyStatus enum (ACTIVE, SUSPENDED, CHURNED)
      - Add InviteType enum (EMAIL, LINK)
      - Add InviteStatus enum (PENDING, ACCEPTED, EXPIRED, CANCELLED)
      - Add relations: Company→User, Company→CompanyInvite, User→CompanyInvite (multiple)
      - Add unique constraints on slug, defaultInviteCode, inviteCode
      - Add partial unique on email+companyId where PENDING
      - Generate and apply migration
    constraints:
      - Soft delete on Company
      - Invite codes globally unique
      - One pending invite per email per company

  acceptance_criteria:
    happy_path:
      - given: "Database with users table"
        when: "Migration runs"
        then: "companies, company_invites tables created with proper relations"
    edge_cases:
      - "Duplicate invite code → unique violation"
      - "Two pending invites for same email+company → unique violation"
    checklist:
      - [ ] Company model with soft delete
      - [ ] CompanyInvite model with all status tracking fields
      - [ ] All enums defined
      - [ ] Proper FK relations to User (invitedBy, acceptedBy, cancelledBy)
      - [ ] Unique constraints configured
      - [ ] Migration applies successfully

```

### Story 1.1.6: Create BackofficeAdmin & AuthAuditLog Schemas

```yaml
story:
  id: S1.1.6
  name: "Create BackofficeAdmin and AuthAuditLog Schemas"
  description: >
    Create entities for platform administration and audit logging.

  flow_ref: null
  depends_on: [S1.1.1]
  effort: medium

  technical_spec:
    what: |
      - Create BackofficeAdmin model
      - Create AuthAuditLog model
      - Add BackofficeRole, AdminStatus, AuthEventType enums
      - Configure audit log for immutability
    how:
      - Define BackofficeAdmin with 12 fields
      - Define AuthAuditLog with 14 fields, JSONB for metadata
      - Add BackofficeRole enum (5 roles from DB Plan)
      - Add AdminStatus enum (ACTIVE, SUSPENDED)
      - Add AuthEventType enum (23 event types from DB Plan)
      - Add self-reference on BackofficeAdmin.createdBy
      - Add indexes for audit log queries (userId, adminId, eventType, createdAt, composite)
      - NO foreign keys on AuthAuditLog (references only)
      - Generate and apply migration
    constraints:
      - AuthAuditLog is INSERT-only (no UPDATE/DELETE at application level)
      - No FK constraints on audit log to preserve logs when referenced entities deleted

  acceptance_criteria:
    happy_path:
      - given: "Database with users table"
        when: "Migration runs"
        then: "backoffice_admins, auth_audit_logs tables created"
    edge_cases:
      - "Audit log references deleted user → log preserved (no FK)"
    checklist:
      - [ ] BackofficeAdmin model with soft delete
      - [ ] AuthAuditLog model without FK constraints
      - [ ] All enums defined (BackofficeRole, AdminStatus, AuthEventType)
      - [ ] Self-reference on BackofficeAdmin.createdBy
      - [ ] Audit log indexes for query optimization
      - [ ] Migration applies successfully

```

### Story 1.1.7: Create AccountLockout Schema

```yaml
story:
  id: S1.1.7
  name: "Create AccountLockout Schema"
  description: >
    Create entity for tracking failed login attempts and lockout state.

  flow_ref: "USER_FLOWS.login.step_2"
  depends_on: [S1.1.1]
  effort: small

  technical_spec:
    what: |
      - Create AccountLockout model
      - Add indexes for lockout queries
      - Configure for upsert pattern
    how:
      - Define AccountLockout with 11 fields from DB Plan
      - Add unique constraint on email
      - Add indexes for email, lockedUntil
      - Generate and apply migration
    constraints:
      - No FK to User (email may not have account yet)
      - Designed for upsert operations

  acceptance_criteria:
    happy_path:
      - given: "Database ready"
        when: "Migration runs"
        then: "account_lockouts table created"
    checklist:
      - [ ] AccountLockout model defined
      - [ ] Unique constraint on email
      - [ ] Indexes created
      - [ ] Migration applies successfully

```

---

## PHASE_2_CORE_AUTH

### Epic 2.1: Core Authentication Services

```yaml
epic:
  id: E2.1
  name: "Core Authentication Services"
  goal: "Implement Firebase integration, signup, login, and session management"
  dependencies: [E1.1]
  duration: "4-5 days"

```

### Story 2.1.1: Implement Firebase Service

```yaml
story:
  id: S2.1.1
  name: "Implement Firebase Admin SDK Service"
  description: >
    Create service wrapper for Firebase Admin SDK operations including
    token verification, custom claims, and refresh token revocation.

  flow_ref: "USER_FLOWS.login.step_2"
  depends_on: [S1.1.1]
  effort: medium

  technical_spec:
    what: |
      - Initialize Firebase Admin SDK
      - Implement token verification
      - Implement custom claims management
      - Implement refresh token revocation
      - Implement custom token creation (for impersonation)
    how:
      - Create FirebaseService as NestJS injectable
      - Initialize SDK with service account credentials from env
      - verifyIdToken(): Verify and decode Firebase ID token
      - setCustomClaims(): Set user_type, subscription_tier, company_id, b2b_role
      - revokeRefreshTokens(): Invalidate all refresh tokens for user
      - createCustomToken(): Generate custom token with claims (impersonation)
      - Add error handling with custom exceptions
      - Add retry logic for transient failures
    constraints:
      - Service account key from environment variable (not file)
      - Custom claims limited to 1000 bytes
      - Token verification caches public keys automatically

  files_to_create:
    - src/modules/auth/services/firebase.service.ts
    - src/modules/auth/interfaces/firebase.interface.ts
    - src/modules/auth/exceptions/firebase.exceptions.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid Firebase ID token"
        when: "verifyIdToken called"
        then: "Returns decoded token with uid and claims"
      - given: "Valid user UID and claims object"
        when: "setCustomClaims called"
        then: "Claims set on Firebase user, returns success"
    edge_cases:
      - "Expired token → FirebaseTokenExpiredException"
      - "Invalid token → FirebaseTokenInvalidException"
      - "Firebase unavailable → FirebaseUnavailableException with retry"
      - "Claims exceed 1000 bytes → FirebaseClaimsLimitException"
    checklist:
      - [ ] Firebase Admin SDK initialized
      - [ ] verifyIdToken implemented with proper error handling
      - [ ] setCustomClaims implemented
      - [ ] revokeRefreshTokens implemented
      - [ ] createCustomToken implemented
      - [ ] Custom exceptions created
      - [ ] Unit tests with Firebase mocks
      - [ ] Integration test with Firebase emulator (optional)

  nfr:
    - "Token verification < 100ms (cached keys)"
    - "Graceful handling of Firebase outages"

```

### Story 2.1.2: Implement Auth Service - Signup Flow

```yaml
story:
  id: S2.1.2
  name: "Implement Auth Service - Signup Flow"
  description: >
    Implement email signup flow including validation, Firebase user creation,
    database user creation, and optional guest merge preparation.

  flow_ref: "USER_FLOWS.email_signup"
  depends_on: [S2.1.1]
  effort: large

  technical_spec:
    what: |
      - Validate signup input (email format, password strength, breach check)
      - Create Firebase user
      - Create database user with PENDING_VERIFICATION status
      - Handle guest merge preparation
      - Set initial custom claims
      - Emit signup event
    how:
      - Create AuthService as NestJS injectable
      - signup(dto: SignupDto, guestId?: string):
        1. Validate email format, normalize to lowercase
        2. Check email not already registered (DB + Firebase)
        3. Check password against HaveIBeenPwned API
        4. Create Firebase user with email/password
        5. Create DB user in transaction
        6. If guestId provided, mark for merge (not executed yet)
        7. Set initial custom claims (userType: B2C, subscriptionTier: free)
        8. Emit auth.signup.completed event
        9. Return user without sensitive data
      - Handle rollback if DB insert fails (delete Firebase user)
    constraints:
      - Email must be unique across both Firebase and DB
      - Password breach check should not block signup (warning only)
      - Transaction for DB operations

  files_to_create:
    - src/modules/auth/services/auth.service.ts
    - src/modules/auth/dto/signup.dto.ts
    - src/modules/auth/interfaces/auth.interface.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid email and password"
        when: "signup called"
        then: "User created in Firebase and DB, status PENDING_VERIFICATION"
      - given: "Valid signup with guestId"
        when: "signup called"
        then: "User created with mergedFromGuestId set"
    edge_cases:
      - "Duplicate email → 409 AUTH_EMAIL_EXISTS"
      - "Weak password → 400 AUTH_VALIDATION_ERROR"
      - "Breached password → 422 AUTH_PASSWORD_BREACHED"
      - "Firebase fails → Rollback, 503 AUTH_PROVIDER_UNAVAILABLE"
      - "DB insert fails → Delete Firebase user, 500 error"
    checklist:
      - [ ] SignupDto with Zod validation
      - [ ] Email normalization (lowercase)
      - [ ] Duplicate email check (DB + Firebase)
      - [ ] Password breach check (HaveIBeenPwned)
      - [ ] Firebase user creation
      - [ ] DB user creation in transaction
      - [ ] Rollback on failure
      - [ ] Guest merge preparation
      - [ ] Custom claims set
      - [ ] Event emitted
      - [ ] Unit tests for all paths

```

### Story 2.1.3: Implement Auth Service - Login Flow

```yaml
story:
  id: S2.1.3
  name: "Implement Auth Service - Login Flow"
  description: >
    Implement login flow including token verification, lockout check,
    user status validation, session creation, and claim refresh.

  flow_ref: "USER_FLOWS.login"
  depends_on: [S2.1.1, S2.1.4]
  effort: large

  technical_spec:
    what: |
      - Verify Firebase ID token
      - Check account lockout status
      - Validate user exists and status allows login
      - Create session (with limit enforcement)
      - Update last login info
      - Refresh custom claims if needed
      - Emit login event
    how:
      - login(dto: LoginDto):
        1. Verify Firebase ID token via FirebaseService
        2. Extract email from token
        3. Check lockout status via LockoutService
        4. Find user by firebaseUid
        5. Validate user status (not SUSPENDED, not DELETED)
        6. Create session via SessionService (handles 5-session limit)
        7. Update user.lastLoginAt, lastLoginIp
        8. Refresh custom claims if stale
        9. Emit auth.login.completed event
        10. Return user, session, customClaims, needsOnboarding flag
      - Handle login failure (increment lockout counter)
    constraints:
      - Lockout check before user lookup (prevent enumeration)
      - Session creation atomic with login
      - Custom claims refresh if > 1 hour old

  files_to_create:
    - src/modules/auth/dto/login.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid Firebase token for active user"
        when: "login called"
        then: "Session created, user data returned with claims"
      - given: "User with PENDING_ONBOARDING status"
        when: "login called"
        then: "Login succeeds, needsOnboarding: true"
    edge_cases:
      - "Invalid token → 401 AUTH_TOKEN_INVALID"
      - "Locked account → 423 AUTH_ACCOUNT_LOCKED"
      - "Suspended account → 403 AUTH_ACCOUNT_SUSPENDED"
      - "Deleted account → 401 (treat as not found)"
      - "5 sessions exist → Oldest revoked, new created"
    checklist:
      - [ ] Token verification with FirebaseService
      - [ ] Lockout check integration
      - [ ] User status validation
      - [ ] Session creation with limit
      - [ ] Last login update
      - [ ] Custom claims refresh
      - [ ] Proper error responses
      - [ ] Event emission
      - [ ] Unit tests

```

### Story 2.1.4: Implement Session Service

```yaml
story:
  id: S2.1.4
  name: "Implement Session Service"
  description: >
    Implement session lifecycle management including creation with limit
    enforcement, single/all revocation, and active session listing.

  flow_ref: "USER_FLOWS.session_management"
  depends_on: [S1.1.3]
  effort: medium

  technical_spec:
    what: |
      - Create session with 5-session limit enforcement
      - Revoke single session (with Firebase token revocation)
      - Revoke all sessions for user
      - List active sessions for user
      - Session expiry calculation
    how:
      - Create SessionService as NestJS injectable
      - createSession(userId, dto):
        1. Count active sessions for user
        2. If >= 5, find oldest by createdAt, revoke it
        3. Create new session with calculated expiresAt
        4. Return session
      - revokeSession(sessionId, userId, reason):
        1. Find session, verify belongs to user
        2. Update status to REVOKED, set revokedAt, reason
        3. Call FirebaseService.revokeRefreshTokens (optional per session)
      - revokeAllSessions(userId, reason):
        1. Find all ACTIVE sessions
        2. Batch update to REVOKED
        3. Call FirebaseService.revokeRefreshTokens(uid)
      - getActiveSessions(userId):
        1. Query sessions where status=ACTIVE and userId
        2. Return with device info
    constraints:
      - Session limit check and create must be atomic
      - Firebase revocation is best-effort (log if fails)
      - Remember me affects expiresAt calculation

  files_to_create:
    - src/modules/auth/services/session.service.ts
    - src/modules/auth/dto/create-session.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "User with < 5 sessions"
        when: "createSession called"
        then: "New session created, total sessions +1"
      - given: "User with 5 sessions"
        when: "createSession called"
        then: "Oldest session revoked, new session created, total still 5"
      - given: "Valid session ID"
        when: "revokeSession called"
        then: "Session status REVOKED, Firebase token revoked"
    edge_cases:
      - "Revoke non-existent session → 404"
      - "Revoke session of different user → 403"
      - "Firebase revocation fails → Log error, continue"
    checklist:
      - [ ] Session creation with limit enforcement
      - [ ] Atomic limit check + create
      - [ ] Single session revocation
      - [ ] All sessions revocation
      - [ ] Active sessions listing
      - [ ] Expiry calculation with rememberMe
      - [ ] Firebase integration
      - [ ] Unit tests

```

### Story 2.1.5: Implement Auth Controller

```yaml
story:
  id: S2.1.5
  name: "Implement Auth Controller"
  description: >
    Create REST controller for authentication endpoints including signup,
    login, logout, profile operations.

  flow_ref: "USER_FLOWS.email_signup, USER_FLOWS.login"
  depends_on: [S2.1.2, S2.1.3]
  effort: medium

  technical_spec:
    what: |
      - POST /auth/signup endpoint
      - POST /auth/login endpoint
      - POST /auth/logout endpoint
      - POST /auth/logout-all endpoint
      - GET /auth/me endpoint
      - PUT /auth/me endpoint
      - POST /auth/refresh endpoint
    how:
      - Create AuthController with NestJS decorators
      - Apply rate limiting decorators per endpoint
      - Apply authentication guards where needed
      - Use DTOs for request validation
      - Format responses per API spec
      - Handle errors with exception filters
    constraints:
      - Rate limits: signup 5/min, login 10/min, others 60/min
      - Signup and login are public, others require auth
      - Response format must match API_SPECIFICATION

  files_to_create:
    - src/modules/auth/controllers/auth.controller.ts
    - src/modules/auth/dto/update-profile.dto.ts
    - src/modules/auth/dto/refresh.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid signup request"
        when: "POST /auth/signup"
        then: "201 response with user data"
      - given: "Valid login request"
        when: "POST /auth/login"
        then: "200 response with user, session, claims"
      - given: "Authenticated user"
        when: "GET /auth/me"
        then: "200 response with full profile"
    edge_cases:
      - "Invalid input → 400 with validation details"
      - "Missing auth on protected endpoint → 401"
      - "Rate limit exceeded → 429 with retry-after"
    checklist:
      - [ ] All endpoints implemented
      - [ ] Rate limiting applied
      - [ ] Auth guards applied correctly
      - [ ] Request validation with DTOs
      - [ ] Response formatting matches spec
      - [ ] Error handling consistent
      - [ ] Unit tests for controller
      - [ ] Integration tests for endpoints

```

### Story 2.1.6: Implement Session Controller

```yaml
story:
  id: S2.1.6
  name: "Implement Session Controller"
  description: >
    Create REST controller for session management endpoints.

  flow_ref: "USER_FLOWS.session_management"
  depends_on: [S2.1.4]
  effort: small

  technical_spec:
    what: |
      - GET /sessions endpoint (list active)
      - DELETE /sessions/:id endpoint (revoke specific)
    how:
      - Create SessionController
      - Both endpoints require authentication
      - Verify session belongs to authenticated user
      - Format responses per API spec
    constraints:
      - Cannot revoke current session via this endpoint (use /logout)

  files_to_create:
    - src/modules/auth/controllers/session.controller.ts

  acceptance_criteria:
    happy_path:
      - given: "Authenticated user with 3 sessions"
        when: "GET /sessions"
        then: "200 response with 3 session objects"
      - given: "Valid session ID belonging to user"
        when: "DELETE /sessions/:id"
        then: "200 response, session revoked"
    edge_cases:
      - "Revoke other user's session → 403"
      - "Revoke non-existent session → 404"
    checklist:
      - [ ] List sessions endpoint
      - [ ] Revoke session endpoint
      - [ ] Auth guard applied
      - [ ] Ownership verification
      - [ ] Unit tests

```

### Story 2.1.7: Implement JWT Guard & Strategy

```yaml
story:
  id: S2.1.7
  name: "Implement JWT Authentication Guard"
  description: >
    Create NestJS guard for Firebase JWT validation that extracts user
    and attaches to request context.

  flow_ref: null
  depends_on: [S2.1.1]
  effort: medium

  technical_spec:
    what: |
      - Custom NestJS guard for Firebase token validation
      - Extract token from Authorization header
      - Verify with FirebaseService
      - Attach user to request
      - Handle public routes
    how:
      - Create FirebaseAuthGuard extending AuthGuard
      - Create FirebaseAuthStrategy implementing PassportStrategy
      - Extract Bearer token from header
      - Verify via FirebaseService.verifyIdToken
      - Load user from database
      - Attach user object to request
      - Create @Public() decorator for unprotected routes
      - Apply guard globally with exceptions
    constraints:
      - Guard must be efficient (cache user lookup if possible)
      - Handle missing token gracefully
      - Support optional auth (guest endpoints)

  files_to_create:
    - src/modules/auth/guards/firebase-auth.guard.ts
    - src/modules/auth/strategies/firebase.strategy.ts
    - src/modules/auth/decorators/public.decorator.ts
    - src/modules/auth/decorators/current-user.decorator.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid Bearer token in header"
        when: "Request to protected endpoint"
        then: "User attached to request, handler executes"
      - given: "Route marked with @Public()"
        when: "Request without token"
        then: "Request proceeds without user"
    edge_cases:
      - "Missing Authorization header → 401"
      - "Invalid token format → 401"
      - "Expired token → 401"
      - "Valid token, user not in DB → 401"
    checklist:
      - [ ] FirebaseAuthGuard implemented
      - [ ] FirebaseAuthStrategy implemented
      - [ ] @Public() decorator
      - [ ] @CurrentUser() decorator
      - [ ] Global guard registration
      - [ ] Error handling
      - [ ] Unit tests

```

---

## PHASE_3_ONBOARDING_GUEST

### Epic 3.1: Guest & Onboarding Services

```yaml
epic:
  id: E3.1
  name: "Guest Tracking & Onboarding Flow"
  goal: "Implement guest tracking, onboarding questions, and persona assignment"
  dependencies: [E2.1]
  duration: "3-4 days"

```

### Story 3.1.1: Implement Guest Service

```yaml
story:
  id: S3.1.1
  name: "Implement Guest Service"
  description: >
    Create service for guest creation with idempotency, activity tracking,
    and merge preparation.

  flow_ref: "USER_FLOWS.guest_creation"
  depends_on: [S1.1.2]
  effort: medium

  technical_spec:
    what: |
      - Create or retrieve guest by device fingerprint
      - Update last seen activity
      - Prepare guest for merge to user
      - Mark guest as merged
    how:
      - Create GuestService
      - createOrGetGuest(dto):
        1. If deviceFingerprint provided, find existing unmerged guest
        2. If found, update lastSeenAt, return existing
        3. If not found, create new guest with UUID v7
        4. Set expiresAt to createdAt + 90 days
        5. Return guest with isNew flag
      - updateActivity(guestId):
        1. Update lastSeenAt timestamp
      - markMerged(guestId, userId):
        1. Update mergedToUserId and mergedAt
        2. Return updated guest
    constraints:
      - Device fingerprint optional (some browsers block)
      - Idempotent creation based on fingerprint
      - UUID v7 for time-sortable IDs

  files_to_create:
    - src/modules/auth/services/guest.service.ts
    - src/modules/auth/dto/create-guest.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "New device fingerprint"
        when: "createOrGetGuest called"
        then: "New guest created, isNew: true"
      - given: "Existing device fingerprint"
        when: "createOrGetGuest called"
        then: "Existing guest returned, lastSeenAt updated, isNew: false"
    edge_cases:
      - "No fingerprint provided → Create new guest each time"
      - "Merged guest with same fingerprint → Create new guest"
    checklist:
      - [ ] createOrGetGuest with idempotency
      - [ ] updateActivity
      - [ ] markMerged
      - [ ] UUID v7 generation
      - [ ] Expiry calculation
      - [ ] Unit tests

```

### Story 3.1.2: Implement Guest Controller

```yaml
story:
  id: S3.1.2
  name: "Implement Guest Controller"
  description: >
    Create REST controller for guest endpoints.

  flow_ref: "USER_FLOWS.guest_creation"
  depends_on: [S3.1.1]
  effort: small

  technical_spec:
    what: |
      - POST /guest endpoint (create or get)
      - PUT /guest/activity endpoint (update activity)
    how:
      - Create GuestController
      - Both endpoints are public (no auth required)
      - Rate limiting to prevent abuse
      - Return guest ID for client storage
    constraints:
      - Rate limit: 20/min per IP

  files_to_create:
    - src/modules/auth/controllers/guest.controller.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid guest creation request"
        when: "POST /guest"
        then: "200/201 response with guestId"
    checklist:
      - [ ] Create/get endpoint
      - [ ] Activity update endpoint
      - [ ] Rate limiting
      - [ ] Response formatting
      - [ ] Unit tests

```

### Story 3.1.3: Implement Onboarding Service

```yaml
story:
  id: S3.1.3
  name: "Implement Onboarding Service"
  description: >
    Create service for onboarding question retrieval, answer submission,
    and completion processing.

  flow_ref: "USER_FLOWS.onboarding_completion"
  depends_on: [S1.1.4]
  effort: large

  technical_spec:
    what: |
      - Retrieve active onboarding questions
      - Validate and store answers
      - Calculate persona from answers
      - Complete onboarding (update user status)
      - Support answer updates after completion
    how:
      - Create OnboardingService
      - getQuestions():
        1. Query active questions ordered by displayOrder
        2. Return with options parsed
      - submitAnswers(userId, answers[]):
        1. Validate user is in PENDING_ONBOARDING status
        2. Validate all required questions answered
        3. Validate answer format matches question type
        4. Store answers in transaction
        5. Calculate persona via PersonaService
        6. Update user: personaId, onboardingCompletedAt, status=ACTIVE
        7. Emit auth.onboarding.completed event
      - updateAnswers(userId, answers[]):
        1. Validate user has completed onboarding
        2. Check cooldown period (configurable)
        3. Create new answer versions (isCurrent=false for old)
        4. Recalculate persona
        5. Update user: onboardingUpdatedAt, possibly personaId
        6. Emit auth.onboarding.updated event
    constraints:
      - All required questions must be answered
      - Answer format must match question type
      - Update cooldown prevents gaming

  files_to_create:
    - src/modules/auth/services/onboarding.service.ts
    - src/modules/auth/dto/submit-answers.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "User in PENDING_ONBOARDING with all answers valid"
        when: "submitAnswers called"
        then: "Answers stored, persona assigned, user status ACTIVE"
    edge_cases:
      - "Missing required answers → 400 validation error"
      - "Wrong answer format → 400 validation error"
      - "Already completed onboarding → 409 conflict"
      - "Update before cooldown → 429 too early"
    checklist:
      - [ ] getQuestions implementation
      - [ ] submitAnswers with validation
      - [ ] Answer storage in transaction
      - [ ] Status update to ACTIVE
      - [ ] updateAnswers with versioning
      - [ ] Cooldown enforcement
      - [ ] Events emitted
      - [ ] Unit tests

```

### Story 3.1.4: Implement Persona Service

```yaml
story:
  id: S3.1.4
  name: "Implement Persona Service"
  description: >
    Create service for persona calculation from onboarding answers
    and persona assignment.

  flow_ref: "USER_FLOWS.onboarding_completion.step_3"
  depends_on: [S1.1.4]
  effort: medium

  technical_spec:
    what: |
      - Calculate persona scores from answers
      - Select best matching persona
      - Get persona by ID/code
      - List active personas
    how:
      - Create PersonaService
      - calculatePersona(answers[]):
        1. Initialize score map for each persona
        2. For each answer:
           - Get question's personaWeight mapping
           - Add weights to persona scores based on answer
        3. Find persona with highest score
        4. Return persona
      - getPersona(id): Direct lookup
      - getActivePersonas(): Query where isActive=true
    constraints:
      - Persona weights stored as JSONB in questions
      - Ties broken by display order

  files_to_create:
    - src/modules/auth/services/persona.service.ts

  acceptance_criteria:
    happy_path:
      - given: "Answers with clear persona affinity"
        when: "calculatePersona called"
        then: "Returns highest scoring persona"
    edge_cases:
      - "Tie between personas → Lower displayOrder wins"
      - "No matching weights → Default persona"
    checklist:
      - [ ] calculatePersona algorithm
      - [ ] Score aggregation
      - [ ] Tie breaking logic
      - [ ] getPersona, getActivePersonas
      - [ ] Unit tests with various answer combinations

```

### Story 3.1.5: Implement Onboarding Controller

```yaml
story:
  id: S3.1.5
  name: "Implement Onboarding Controller"
  description: >
    Create REST controller for onboarding endpoints.

  flow_ref: "USER_FLOWS.onboarding_completion"
  depends_on: [S3.1.3, S3.1.4]
  effort: small

  technical_spec:
    what: |
      - GET /onboarding/questions endpoint
      - POST /onboarding/submit endpoint
      - PUT /onboarding/update endpoint
    how:
      - Create OnboardingController
      - Questions endpoint requires auth
      - Submit requires PENDING_ONBOARDING status
      - Update requires completed onboarding + cooldown check
    constraints:
      - Status checks in controller or guard

  files_to_create:
    - src/modules/auth/controllers/onboarding.controller.ts

  acceptance_criteria:
    checklist:
      - [ ] Questions endpoint
      - [ ] Submit endpoint with status check
      - [ ] Update endpoint with cooldown
      - [ ] Proper auth guards
      - [ ] Response formatting
      - [ ] Unit tests

```

### Story 3.1.6: Implement Guest Merge Flow

```yaml
story:
  id: S3.1.6
  name: "Implement Guest to User Merge Flow"
  description: >
    Implement complete guest merge flow triggered during signup,
    including database updates and event emission for other modules.

  flow_ref: "USER_FLOWS.email_signup.step_4"
  depends_on: [S3.1.1, S2.1.2]
  effort: medium

  technical_spec:
    what: |
      - Atomic merge transaction (Guest + User updates)
      - Emit event for other modules to merge progress
      - Handle merge conflicts
    how:
      - Extend AuthService.signup to handle merge:
        1. If guestId provided and valid:
           - Verify guest not already merged
           - In signup transaction:
             a. Create user with mergedFromGuestId
             b. Update guest with mergedToUserId, mergedAt
           - After commit, emit auth.guest.merged event
        2. If guestId invalid or already merged:
           - Continue signup without merge, log warning
      - Create GuestMergeJob (BullMQ consumer):
        1. Receives auth.guest.merged event
        2. Placeholder for other module integration
    constraints:
      - Merge is atomic with signup
      - Event emission after successful commit
      - Other modules responsible for progress merge

  files_to_create:
    - src/modules/auth/jobs/guest-merge.job.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid guestId during signup"
        when: "Signup completes"
        then: "Guest marked merged, user has mergedFromGuestId, event emitted"
    edge_cases:
      - "Invalid guestId → Signup proceeds without merge"
      - "Already merged guestId → Signup proceeds without merge"
      - "Transaction fails → Both guest and user unchanged"
    checklist:
      - [ ] Signup extended with merge logic
      - [ ] Atomic transaction
      - [ ] Event emission
      - [ ] Invalid guest handling
      - [ ] GuestMergeJob placeholder
      - [ ] Integration tests

```

---

## PHASE_4_B2B_ADMIN

### Epic 4.1: B2B Membership & Admin Services

```yaml
epic:
  id: E4.1
  name: "B2B Membership & Admin Operations"
  goal: "Implement company invite system, membership management, and backoffice admin features"
  dependencies: [E3.1]
  duration: "4-5 days"

```

### Story 4.1.1: Implement B2B Service - Core

```yaml
story:
  id: S4.1.1
  name: "Implement B2B Service - Core Operations"
  description: >
    Create service for B2B membership operations including join, leave,
    and member management.

  flow_ref: "USER_FLOWS.b2b_invite_acceptance"
  depends_on: [S1.1.5]
  effort: large

  technical_spec:
    what: |
      - Accept invite and join company
      - Leave company voluntarily
      - Remove member (admin action)
      - Update member role
      - Seat limit enforcement
    how:
      - Create B2BService
      - acceptInvite(userId, inviteCode):
        1. Find invite by code, validate status/expiry
        2. Check user not already in a company
        3. Check company seat availability
        4. Execute in transaction:
           a. Update invite: status=ACCEPTED, acceptedByUserId, acceptedAt
           b. Update user: userType=B2B, companyId, b2bRole, b2bJoinedAt
           c. Increment company.currentSeatCount
           d. Log audit event
        5. Update Firebase custom claims
        6. Emit auth.b2b.joined event
      - leaveCompany(userId):
        1. Verify user is B2B
        2. Execute in transaction:
           a. Update user: userType=B2C, companyId=null, b2bRole=null
           b. Decrement company.currentSeatCount
           c. Log audit event
        3. Update Firebase custom claims
        4. Emit auth.b2b.left event
      - removeMember(adminUserId, targetUserId):
        1. Verify admin has permission
        2. Same as leaveCompany but with admin context
        3. Different audit event metadata
      - updateMemberRole(adminUserId, targetUserId, newRole):
        1. Verify admin has permission (COMPANY_ADMIN only)
        2. Update user.b2bRole
        3. Update Firebase custom claims
        4. Emit auth.b2b.role_changed event
    constraints:
      - Atomic transactions for all state changes
      - Seat count must stay in sync
      - Cannot remove last COMPANY_ADMIN

  files_to_create:
    - src/modules/auth/services/b2b.service.ts
    - src/modules/auth/dto/accept-invite.dto.ts
    - src/modules/auth/dto/update-role.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid invite code and available seats"
        when: "acceptInvite called"
        then: "User becomes B2B member, seat count incremented"
      - given: "B2B user"
        when: "leaveCompany called"
        then: "User becomes B2C, seat count decremented"
    edge_cases:
      - "Expired invite → 410 B2B_INVITE_EXPIRED"
      - "No seats available → 403 B2B_SEAT_LIMIT_REACHED"
      - "Already in company → 409 B2B_ALREADY_MEMBER"
      - "Remove last admin → 400 B2B_LAST_ADMIN"
    checklist:
      - [ ] acceptInvite with full flow
      - [ ] leaveCompany
      - [ ] removeMember with permission check
      - [ ] updateMemberRole
      - [ ] Seat count management
      - [ ] Firebase claims update
      - [ ] Events emitted
      - [ ] Audit logging
      - [ ] Unit tests

```

### Story 4.1.2: Implement Invite Management

```yaml
story:
  id: S4.1.2
  name: "Implement Invite Management"
  description: >
    Create functionality for creating, listing, and cancelling B2B invites.

  flow_ref: "USER_FLOWS.b2b_invite_acceptance.step_1"
  depends_on: [S4.1.1]
  effort: medium

  technical_spec:
    what: |
      - Create email invite (single recipient)
      - Create link invite (reusable)
      - Bulk create invites from CSV
      - List company invites
      - Cancel pending invite
      - Get invite by code (public)
    how:
      - Extend B2BService:
      - createEmailInvite(adminUserId, dto):
        1. Verify admin permission
        2. Check no pending invite for email+company
        3. Generate unique invite code
        4. Create invite with type=EMAIL, maxUses=null
        5. Trigger email notification (via event)
      - createLinkInvite(adminUserId, dto):
        1. Verify admin permission
        2. Generate unique invite code
        3. Create invite with type=LINK, maxUses from dto
      - bulkCreateInvites(adminUserId, emails[]):
        1. Validate CSV/array
        2. Create invites in batch
        3. Return success/failure per email
      - cancelInvite(adminUserId, inviteId):
        1. Find invite, verify company match
        2. Update status=CANCELLED, cancelledAt, cancelledByUserId
      - getInviteByCode(code):
        1. Find invite by code
        2. Return company name, role, status (no sensitive data)
    constraints:
      - Invite codes must be globally unique
      - Rate limit on bulk invites
      - Email invites send notification

  files_to_create:
    - src/modules/auth/dto/create-invite.dto.ts
    - src/modules/auth/dto/bulk-invite.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Admin user and valid email"
        when: "createEmailInvite called"
        then: "Invite created, email event emitted"
      - given: "Valid invite code"
        when: "getInviteByCode called"
        then: "Returns invite details (public view)"
    edge_cases:
      - "Duplicate email invite → 409 B2B_INVITE_EXISTS"
      - "Non-admin tries to create → 403"
      - "Cancel non-pending invite → 400"
    checklist:
      - [ ] Email invite creation
      - [ ] Link invite creation
      - [ ] Bulk invite with error handling
      - [ ] List invites with filters
      - [ ] Cancel invite
      - [ ] Public invite lookup
      - [ ] Permission checks
      - [ ] Unit tests

```

### Story 4.1.3: Implement B2B Controller

```yaml
story:
  id: S4.1.3
  name: "Implement B2B Controller"
  description: >
    Create REST controller for all B2B endpoints.

  flow_ref: "USER_FLOWS.b2b_invite_acceptance"
  depends_on: [S4.1.1, S4.1.2]
  effort: medium

  technical_spec:
    what: |
      - GET /b2b/invite/:code (public)
      - POST /b2b/invite/accept
      - POST /b2b/invite (admin)
      - POST /b2b/invite/bulk (admin)
      - DELETE /b2b/invite/:id (admin)
      - GET /b2b/invites (admin)
      - POST /b2b/leave
      - GET /b2b/members (admin)
      - PUT /b2b/members/:id/role (admin)
      - DELETE /b2b/members/:id (admin)
    how:
      - Create B2BController
      - Apply role guards for admin endpoints
      - Public endpoints for invite lookup/accept
      - Response formatting per spec
    constraints:
      - Admin endpoints check B2B role permissions

  files_to_create:
    - src/modules/auth/controllers/b2b.controller.ts
    - src/modules/auth/guards/b2b-role.guard.ts

  acceptance_criteria:
    checklist:
      - [ ] All endpoints implemented
      - [ ] Role guards for admin endpoints
      - [ ] Proper error responses
      - [ ] Response formatting
      - [ ] Integration tests

```

### Story 4.1.4: Implement Admin Service

```yaml
story:
  id: S4.1.4
  name: "Implement Admin Service"
  description: >
    Create service for backoffice administrative operations.

  flow_ref: null
  depends_on: [S1.1.6]
  effort: large

  technical_spec:
    what: |
      - User search and listing with filters
      - Get user details (full profile)
      - Suspend user account
      - Reactivate suspended user
      - Query audit logs
    how:
      - Create AdminService
      - listUsers(filters, pagination):
        1. Build query with filters (status, userType, companyId, date range)
        2. Apply pagination
        3. Return users with counts
      - getUser(userId):
        1. Fetch user with relations (company, persona, sessions)
        2. Include recent audit events
      - suspendUser(adminId, userId, reason):
        1. Verify user not already suspended/deleted
        2. Update status=SUSPENDED
        3. Revoke all sessions
        4. Log audit event
        5. Emit auth.user.suspended
      - reactivateUser(adminId, userId):
        1. Verify user is suspended
        2. Update status=ACTIVE
        3. Log audit event
        4. Emit auth.user.reactivated
      - queryAuditLogs(filters, pagination):
        1. Query auth_audit_logs with filters
        2. Return with pagination
    constraints:
      - Cannot suspend/delete backoffice admins through this service
      - Audit log queries have max limit

  files_to_create:
    - src/modules/auth/services/admin.service.ts
    - src/modules/auth/dto/list-users.dto.ts
    - src/modules/auth/dto/suspend-user.dto.ts
    - src/modules/auth/dto/query-audit.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid filters"
        when: "listUsers called"
        then: "Returns paginated user list"
      - given: "Active user"
        when: "suspendUser called"
        then: "User suspended, sessions revoked, event emitted"
    edge_cases:
      - "Suspend already suspended → 400"
      - "Reactivate non-suspended → 400"
      - "Suspend self → 400"
    checklist:
      - [ ] listUsers with filters
      - [ ] getUser with relations
      - [ ] suspendUser with session revocation
      - [ ] reactivateUser
      - [ ] queryAuditLogs
      - [ ] Permission checks
      - [ ] Unit tests

```

### Story 4.1.5: Implement Admin Controller

```yaml
story:
  id: S4.1.5
  name: "Implement Admin Controller"
  description: >
    Create REST controller for backoffice admin endpoints.

  flow_ref: null
  depends_on: [S4.1.4]
  effort: medium

  technical_spec:
    what: |
      - GET /admin/users (list/search)
      - GET /admin/users/:id (details)
      - POST /admin/users/:id/suspend
      - POST /admin/users/:id/reactivate
      - GET /admin/audit-logs
    how:
      - Create AdminController
      - Apply backoffice role guard to all endpoints
      - Different roles have different access levels
      - Response formatting per spec
    constraints:
      - Only backoffice admins can access
      - Role-based access within backoffice

  files_to_create:
    - src/modules/auth/controllers/admin.controller.ts
    - src/modules/auth/guards/backoffice-role.guard.ts

  acceptance_criteria:
    checklist:
      - [ ] All endpoints implemented
      - [ ] Backoffice role guard
      - [ ] Role-based access control
      - [ ] Response formatting
      - [ ] Integration tests

```

### Story 4.1.6: Implement Impersonation

```yaml
story:
  id: S4.1.6
  name: "Implement Admin Impersonation"
  description: >
    Implement ability for admins to impersonate users for support purposes.

  flow_ref: null
  depends_on: [S4.1.4, S2.1.4]
  effort: medium

  technical_spec:
    what: |
      - Start impersonation (get token for target user)
      - End impersonation
      - Track impersonation in audit log
    how:
      - Extend AdminService:
      - startImpersonation(adminId, targetUserId):
        1. Verify admin has SUPER_ADMIN or SUPPORT_AGENT role
        2. Verify target user exists and is not admin
        3. Create custom Firebase token for target user
        4. Log ADMIN_IMPERSONATE_START audit event
        5. Return token (client uses for subsequent requests)
      - endImpersonation(adminId, targetUserId):
        1. Log ADMIN_IMPERSONATE_END audit event
        2. (Client discards impersonation token)
      - Add endpoints:
        - POST /admin/users/:id/impersonate
        - POST /admin/impersonate/end
    constraints:
      - Impersonation limited to specific roles
      - Cannot impersonate other admins
      - All actions during impersonation logged with admin context

  files_to_create:
    - src/modules/auth/dto/impersonate.dto.ts

  acceptance_criteria:
    happy_path:
      - given: "Super admin and valid target user"
        when: "startImpersonation called"
        then: "Returns custom token, audit logged"
    edge_cases:
      - "Impersonate admin user → 403"
      - "Non-admin tries to impersonate → 403"
      - "Impersonate deleted user → 404"
    checklist:
      - [ ] startImpersonation with token generation
      - [ ] endImpersonation
      - [ ] Permission verification
      - [ ] Audit logging
      - [ ] Controller endpoints
      - [ ] Unit tests

```

---

## PHASE_5_SECURITY_POLISH

### Epic 5.1: Security Services

```yaml
epic:
  id: E5.1
  name: "Security & Audit Services"
  goal: "Implement lockout, audit logging, and rate limiting"
  dependencies: [E4.1]
  duration: "2-3 days"

```

### Story 5.1.1: Implement Lockout Service

```yaml
story:
  id: S5.1.1
  name: "Implement Account Lockout Service"
  description: >
    Create service for tracking failed login attempts and enforcing
    progressive lockout policy.

  flow_ref: "USER_FLOWS.login.step_2"
  depends_on: [S1.1.7]
  effort: medium

  technical_spec:
    what: |
      - Track failed login attempts
      - Check lockout status before login
      - Enforce progressive lockout (5→5min, 10→30min, 15→email)
      - Clear on successful login
      - Email unlock flow
    how:
      - Create LockoutService
      - Use Valkey for hot data (fast checks), DB for persistence
      - checkLockout(email):
        1. Check Valkey for lock status
        2. If locked, check if expired
        3. Return isLocked, lockedUntil, lockLevel
      - recordFailedAttempt(email):
        1. Increment failed attempts
        2. Calculate new lock level
        3. If threshold reached, set lockedUntil
        4. If level 3, set requiresEmailUnlock, generate token
        5. Update Valkey and DB
      - recordSuccessfulLogin(email):
        1. Clear lockout record
        2. Clear Valkey cache
      - unlockWithToken(email, token):
        1. Validate token and expiry
        2. Clear lockout
        3. Return success
    constraints:
      - Valkey TTL matches lockout duration
      - Level 3 lockout requires email, not time-based
      - Lockout by email, not user_id (pre-account protection)

  files_to_create:
    - src/modules/auth/services/lockout.service.ts

  acceptance_criteria:
    happy_path:
      - given: "5 failed attempts"
        when: "recordFailedAttempt called"
        then: "Account locked for 5 minutes"
      - given: "Successful login"
        when: "recordSuccessfulLogin called"
        then: "Lockout cleared"
    edge_cases:
      - "15 failed attempts → Email unlock required"
      - "Check after lockout expires → Not locked"
      - "Invalid unlock token → Error"
    checklist:
      - [ ] checkLockout
      - [ ] recordFailedAttempt with progressive levels
      - [ ] recordSuccessfulLogin
      - [ ] unlockWithToken
      - [ ] Valkey integration
      - [ ] DB persistence
      - [ ] Unit tests

```

### Story 5.1.2: Implement Audit Service

```yaml
story:
  id: S5.1.2
  name: "Implement Audit Logging Service"
  description: >
    Create service for immutable audit event logging.

  flow_ref: null
  depends_on: [S1.1.6]
  effort: small

  technical_spec:
    what: |
      - Log authentication events
      - Support all 23 event types
      - Include context (IP, user agent, device)
      - Query support for admin
    how:
      - Create AuditService
      - logEvent(dto):
        1. Create audit log record (INSERT only)
        2. Hash IP address before storing
        3. Include correlation ID from request context
      - Helper methods for common events:
        - logLoginSuccess, logLoginFailure
        - logSignup, logLogout
        - logB2BJoin, logB2BLeave
        - etc.
    constraints:
      - INSERT only - no updates or deletes
      - IP always hashed
      - User agent truncated to 500 chars

  files_to_create:
    - src/modules/auth/services/audit.service.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid event data"
        when: "logEvent called"
        then: "Audit record created"
    checklist:
      - [ ] logEvent implementation
      - [ ] Helper methods for all event types
      - [ ] IP hashing
      - [ ] INSERT-only enforcement
      - [ ] Unit tests

```

### Story 5.1.3: Implement Rate Limiting

```yaml
story:
  id: S5.1.3
  name: "Implement Rate Limiting"
  description: >
    Configure and implement rate limiting for auth endpoints.

  flow_ref: null
  depends_on: [S2.1.5]
  effort: small

  technical_spec:
    what: |
      - Rate limit by IP for public endpoints
      - Rate limit by user for authenticated endpoints
      - Different limits per endpoint
      - Proper 429 responses
    how:
      - Configure @nestjs/throttler with Valkey storage
      - Create custom decorators for endpoint-specific limits
      - Configure limits:
        - /auth/signup: 5/minute/IP
        - /auth/login: 10/minute/IP
        - /auth/password-reset/*: 3/hour/email
        - /guest: 20/minute/IP
        - Default authenticated: 60/minute/user
      - Return 429 with Retry-After header
    constraints:
      - Use sliding window algorithm
      - Valkey for distributed rate limit state

  files_to_create:
    - src/modules/auth/decorators/rate-limit.decorator.ts

  acceptance_criteria:
    happy_path:
      - given: "Request within limit"
        when: "Endpoint called"
        then: "Request proceeds"
      - given: "Limit exceeded"
        when: "Endpoint called"
        then: "429 response with Retry-After"
    checklist:
      - [ ] Throttler configured
      - [ ] Valkey storage
      - [ ] Per-endpoint limits
      - [ ] Retry-After header
      - [ ] Unit tests

```

### Epic 5.2: Error Handling & Observability

```yaml
epic:
  id: E5.2
  name: "Error Handling & Observability"
  goal: "Production-ready error handling, logging, and metrics"
  dependencies: [E5.1]
  duration: "2-3 days"

```

### Story 5.1.4: Implement Comprehensive Error Handling

```yaml
story:
  id: S5.1.4
  name: "Implement Comprehensive Error Handling"
  description: >
    Create consistent error handling across all auth module components.

  flow_ref: null
  depends_on: [S5.1.1, S5.1.2, S5.1.3]
  effort: medium

  technical_spec:
    what: |
      - Custom exception classes for all error types
      - Global exception filter for auth module
      - Consistent error response format
      - Error code taxonomy
    how:
      - Create exception classes:
        - AuthValidationException (400)
        - AuthUnauthorizedException (401)
        - AuthForbiddenException (403)
        - AuthNotFoundException (404)
        - AuthConflictException (409)
        - AuthGoneException (410)
        - AuthUnprocessableException (422)
        - AuthLockedExeption (423)
        - AuthRateLimitException (429)
        - AuthProviderException (503)
      - Create AuthExceptionFilter
      - Map exceptions to response format
      - Include error codes from taxonomy
      - Redact sensitive data in errors
    constraints:
      - Never expose stack traces in production
      - Never expose internal details
      - Always include error code for client handling

  files_to_create:
    - src/modules/auth/exceptions/index.ts
    - src/modules/auth/filters/auth-exception.filter.ts

  acceptance_criteria:
    happy_path:
      - given: "Exception thrown"
        when: "Filter catches"
        then: "Formatted error response returned"
    checklist:
      - [ ] All exception classes
      - [ ] Exception filter
      - [ ] Error code mapping
      - [ ] Response format per spec
      - [ ] Sensitive data redaction
      - [ ] Unit tests

```

### Story 5.1.5: Implement Logging & Metrics

```yaml
story:
  id: S5.1.5
  name: "Implement Structured Logging & Metrics"
  description: >
    Implement structured logging and metrics collection for observability.

  flow_ref: null
  depends_on: [S5.1.4]
  effort: medium

  technical_spec:
    what: |
      - Structured JSON logging with Pino
      - Request/response logging
      - Sensitive field redaction
      - Prometheus metrics
      - Health check endpoints
    how:
      - Configure Pino logger
      - Create logging interceptor:
        - Log request start (method, path, user)
        - Log request end (status, duration)
        - Redact sensitive fields
      - Create metrics service:
        - auth_signup_total
        - auth_login_total / auth_login_success_total
        - auth_login_duration_seconds
        - auth_session_active_count
        - auth_lockout_total
        - auth_guest_merge_total
        - auth_b2b_join_total
      - Create health endpoints:
        - /health (basic)
        - /ready (DB + Firebase connectivity)
    constraints:
      - Log level configurable by environment
      - PII never in logs
      - Correlation ID in every log

  files_to_create:
    - src/modules/auth/interceptors/logging.interceptor.ts
    - src/modules/auth/services/metrics.service.ts
    - src/modules/auth/controllers/health.controller.ts

  acceptance_criteria:
    checklist:
      - [ ] Pino configured with JSON format
      - [ ] Logging interceptor
      - [ ] Sensitive field redaction
      - [ ] All metrics implemented
      - [ ] Health check endpoints
      - [ ] Correlation ID propagation

```

### Story 5.1.6: Implement Event Publishing

```yaml
story:
  id: S5.1.6
  name: "Implement Event Publishing"
  description: >
    Implement BullMQ event publishing for all auth events.

  flow_ref: null
  depends_on: [S2.1.2]
  effort: medium

  technical_spec:
    what: |
      - Event publisher service using BullMQ
      - All 12 auth events from spec
      - Reliable delivery with retries
      - Event schema validation
    how:
      - Create EventService
      - Configure BullMQ queue for auth events
      - publish(eventType, payload):
        1. Validate payload against schema
        2. Add to queue with:
           - eventId (UUID)
           - eventType
           - timestamp
           - source: "user-auth"
           - correlationId from context
           - data: payload
        3. Configure retry policy (3 attempts, exponential backoff)
      - Helper methods for each event type
    constraints:
      - Events must be idempotent
      - Include correlation ID
      - Schema validation before publish

  files_to_create:
    - src/modules/auth/services/event.service.ts
    - src/modules/auth/events/schemas/index.ts

  acceptance_criteria:
    happy_path:
      - given: "Valid event payload"
        when: "publish called"
        then: "Event added to queue"
    checklist:
      - [ ] EventService with BullMQ
      - [ ] All 12 event types
      - [ ] Schema validation
      - [ ] Retry configuration
      - [ ] Helper methods
      - [ ] Unit tests

```

### Story 5.1.7: Implement Scheduled Jobs

```yaml
story:
  id: S5.1.7
  name: "Implement Scheduled Cleanup Jobs"
  description: >
    Create scheduled jobs for cleanup and maintenance tasks.

  flow_ref: null
  depends_on: [S3.1.1]
  effort: small

  technical_spec:
    what: |
      - Expired guest cleanup (90 days)
      - Expired session cleanup (30 days after expiry)
      - Expired lockout cleanup (7 days)
      - Expired invite status update
    how:
      - Create scheduled jobs using NestJS @Cron
      - GuestCleanupJob:
        - Run daily at 3 AM UTC
        - Delete guests where expiresAt < now and not merged
      - SessionCleanupJob:
        - Run daily at 4 AM UTC
        - Delete sessions where status != ACTIVE and updatedAt < 30 days ago
      - LockoutCleanupJob:
        - Run daily at 5 AM UTC
        - Delete lockouts where lockedUntil < 7 days ago
      - InviteExpiryJob:
        - Run hourly
        - Update status to EXPIRED where expiresAt < now and status = PENDING
    constraints:
      - Jobs must be idempotent
      - Batch processing to avoid memory issues
      - Log job execution

  files_to_create:
    - src/modules/auth/jobs/cleanup.jobs.ts

  acceptance_criteria:
    happy_path:
      - given: "Expired guests exist"
        when: "GuestCleanupJob runs"
        then: "Expired guests deleted"
    checklist:
      - [ ] GuestCleanupJob
      - [ ] SessionCleanupJob
      - [ ] LockoutCleanupJob
      - [ ] InviteExpiryJob
      - [ ] Batch processing
      - [ ] Logging
      - [ ] Unit tests

```

---

## TESTING_STRATEGY

```yaml
testing:

  unit_tests:
    coverage_target: "80%"
    focus_areas:
      - "AuthService - signup, login logic"
      - "SessionService - limit enforcement, revocation"
      - "OnboardingService - answer validation, persona calculation"
      - "B2BService - invite processing, seat management"
      - "LockoutService - progressive lockout logic"
      - "PersonaService - score calculation"
    mocking:
      - "FirebaseService (mock Firebase Admin SDK)"
      - "PrismaService (mock database)"
      - "Valkey client (mock Redis)"
      - "BullMQ (mock queue)"
    tools:
      - "Vitest for test runner"
      - "vitest-mock-extended for mocking"

  integration_tests:
    focus_areas:
      - "Auth flow: signup → verify → login → logout"
      - "Guest flow: create → activity → merge on signup"
      - "Onboarding flow: questions → submit → persona"
      - "B2B flow: invite → accept → member operations"
      - "Session management: create → list → revoke"
      - "Lockout flow: failures → lock → unlock"
    test_database: "Testcontainers with PostgreSQL"
    test_redis: "Testcontainers with Redis"
    tools:
      - "Supertest for HTTP testing"
      - "Testcontainers for DB/Redis"
      - "prisma-test-utils for DB seeding"

  e2e_tests:
    critical_flows:
      - "Complete signup with email verification"
      - "Social login (Google) flow"
      - "B2B invite acceptance flow"
      - "Admin impersonation flow"
    environment: "Staging with Firebase emulator"
    tools:
      - "Playwright (if web UI)"
      - "Supertest for API-only"

  test_data:
    fixtures:
      - "users.fixture.ts - sample users in various states"
      - "companies.fixture.ts - sample companies with invites"
      - "personas.fixture.ts - all persona types"
      - "onboarding.fixture.ts - questions with options"
    factories:
      - "UserFactory - create users with specific attributes"
      - "SessionFactory - create sessions"
      - "InviteFactory - create invites"
      - "Use prisma-factory for Prisma integration"

  test_coverage_exceptions:
    - "Firebase SDK wrapper (tested via integration)"
    - "Scheduled jobs (tested via integration)"
    - "Health check endpoints"

```

---

## DEPLOYMENT_NOTES

```yaml
deployment:

  environment_variables:
    required:
      - name: DATABASE_URL
        description: "PostgreSQL connection string"
        example: "postgresql://user:pass@host:5432/softerise?schema=public"
      - name: REDIS_URL
        description: "Valkey/Redis connection string"
        example: "redis://host:6379"
      - name: FIREBASE_PROJECT_ID
        description: "Firebase project identifier"
        example: "softerise-prod"
      - name: FIREBASE_PRIVATE_KEY
        description: "Firebase service account private key (base64 encoded)"
        example: "LS0tLS1CRUdJTi..."
      - name: FIREBASE_CLIENT_EMAIL
        description: "Firebase service account email"
        example: "firebase-adminsdk@softerise.iam.gserviceaccount.com"
      - name: HIBP_API_KEY
        description: "HaveIBeenPwned API key for breach check"
        example: "hibp_xxxxx"
    optional:
      - name: JWT_ACCESS_EXPIRY
        description: "Access token expiry"
        default: "1h"
      - name: SESSION_EXPIRY_REMEMBER_ME
        description: "Session expiry with remember me"
        default: "30d"
      - name: SESSION_EXPIRY_DEFAULT
        description: "Session expiry without remember me"
        default: "24h"
      - name: GUEST_RETENTION_DAYS
        description: "Days to keep guest data"
        default: "90"
      - name: LOG_LEVEL
        description: "Logging level"
        default: "info"

  dependencies:
    infrastructure:
      - "PostgreSQL 15+ (Render managed)"
      - "Valkey (Redis-compatible, Render managed)"
      - "BullMQ queues"
    services:
      - "Firebase Auth project configured"
      - "HaveIBeenPwned API access (optional but recommended)"

  migrations:
    strategy: "Run on deploy via CI/CD"
    command: "npx prisma migrate deploy"
    rollback: "npx prisma migrate resolve --rolled-back {migration_name}"
    notes:
      - "Always backup before production migration"
      - "Test migration on staging first"
      - "Large data migrations should be batched"

  health_checks:
    endpoints:
      - path: /health
        checks: ["Basic app health"]
        interval: "10s"
      - path: /ready
        checks: ["Database connectivity", "Redis connectivity", "Firebase connectivity"]
        interval: "30s"

  feature_flags:
    - flag: ENABLE_BREACH_CHECK
      purpose: "Enable/disable HaveIBeenPwned password check"
      default: true
    - flag: ENABLE_GUEST_MERGE
      purpose: "Enable/disable guest to user merge"
      default: true
    - flag: ENABLE_IMPERSONATION
      purpose: "Enable/disable admin impersonation"
      default: true

  rollout:
    strategy: "Blue-green deployment"
    canary: "10% traffic for 15 minutes before full rollout"
    rollback_trigger: "Error rate > 5% or p99 > 1s"

```

---

## APPENDIX

### A. Glossary (Module-Specific)

```yaml
terms:
  - term: "Custom Claims"
    definition: "JWT payload data set by backend, included in Firebase ID token. Used for quick authorization checks without DB lookup."

  - term: "Guest Merge"
    definition: "Process of transferring anonymous guest progress to a newly registered user account."

  - term: "Progressive Lockout"
    definition: "Security measure that increases lockout duration with each threshold of failed attempts (5→5min, 10→30min, 15→email)."

  - term: "Seat"
    definition: "B2B license unit. One seat = one employee user allowed in company."

  - term: "Persona"
    definition: "User archetype determined by onboarding answers, used for content personalization."

  - term: "Impersonation"
    definition: "Admin feature to act as another user for support purposes, fully audited."

```

### B. Open Questions

```yaml
open_questions:
  - id: Q1
    question: "Should password breach check be blocking or warning?"
    context: "HaveIBeenPwned check adds latency and external dependency"
    options:
      - "Blocking: Reject breached passwords"
      - "Warning: Allow but warn user"
      - "Configurable via feature flag"
    status: resolved
    resolution: "Warning only (422 response but signup proceeds if user confirms)"

  - id: Q2
    question: "Onboarding update cooldown period?"
    context: "Prevent gaming by frequently changing answers"
    options:
      - "7 days"
      - "30 days"
      - "No cooldown"
    status: open
    resolution: "TBD - suggest 30 days"

  - id: Q3
    question: "Should Firebase token revocation be per-session or per-user?"
    context: "Firebase revokes ALL refresh tokens for a user, not per-device"
    options:
      - "Revoke all on any session revoke"
      - "Only revoke all on explicit 'logout all'"
    status: resolved
    resolution: "Only revoke all on explicit 'logout all' - single session revoke just marks DB, user re-auths on next token refresh"

```

### C. References

```yaml
references:
  internal:
    - "PROJECT_CHARTER.md - Overall project context"
    - "MODULE_USER_AUTH_DB_PLAN.md - Database schema specification"
  external:
    - name: "Firebase Admin SDK"
      url: "https://firebase.google.com/docs/admin/setup"
      purpose: "Authentication implementation"
    - name: "NestJS Authentication"
      url: "https://docs.nestjs.com/security/authentication"
      purpose: "Framework authentication patterns"
    - name: "NIST Password Guidelines"
      url: "https://pages.nist.gov/800-63-3/sp800-63b.html"
      purpose: "Password policy reference"
    - name: "HaveIBeenPwned API"
      url: "https://haveibeenpwned.com/API/v3"
      purpose: "Password breach checking"
    - name: "OWASP Authentication Cheat Sheet"
      url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html"
      purpose: "Security best practices"

```

---

## STORY SUMMARY TABLE

| Story ID | Name | Phase | Effort | Depends On |
| --- | --- | --- | --- | --- |
| S1.1.1 | Create User Entity Schema | 1 | medium | - |
| S1.1.2 | Create Guest Entity Schema | 1 | small | S1.1.1 |
| S1.1.3 | Create Session Entity Schema | 1 | small | S1.1.1 |
| S1.1.4 | Create Persona & Onboarding Schemas | 1 | medium | S1.1.1 |
| S1.1.5 | Create Company & Invite Schemas | 1 | medium | S1.1.1 |
| S1.1.6 | Create Admin & Audit Schemas | 1 | medium | S1.1.1 |
| S1.1.7 | Create Lockout Schema | 1 | small | S1.1.1 |
| S2.1.1 | Implement Firebase Service | 2 | medium | S1.1.1 |
| S2.1.2 | Implement Auth Service - Signup | 2 | large | S2.1.1 |
| S2.1.3 | Implement Auth Service - Login | 2 | large | S2.1.1, S2.1.4 |
| S2.1.4 | Implement Session Service | 2 | medium | S1.1.3 |
| S2.1.5 | Implement Auth Controller | 2 | medium | S2.1.2, S2.1.3 |
| S2.1.6 | Implement Session Controller | 2 | small | S2.1.4 |
| S2.1.7 | Implement JWT Guard | 2 | medium | S2.1.1 |
| S3.1.1 | Implement Guest Service | 3 | medium | S1.1.2 |
| S3.1.2 | Implement Guest Controller | 3 | small | S3.1.1 |
| S3.1.3 | Implement Onboarding Service | 3 | large | S1.1.4 |
| S3.1.4 | Implement Persona Service | 3 | medium | S1.1.4 |
| S3.1.5 | Implement Onboarding Controller | 3 | small | S3.1.3, S3.1.4 |
| S3.1.6 | Implement Guest Merge Flow | 3 | medium | S3.1.1, S2.1.2 |
| S4.1.1 | Implement B2B Service - Core | 4 | large | S1.1.5 |
| S4.1.2 | Implement Invite Management | 4 | medium | S4.1.1 |
| S4.1.3 | Implement B2B Controller | 4 | medium | S4.1.1, S4.1.2 |
| S4.1.4 | Implement Admin Service | 4 | large | S1.1.6 |
| S4.1.5 | Implement Admin Controller | 4 | medium | S4.1.4 |
| S4.1.6 | Implement Impersonation | 4 | medium | S4.1.4, S2.1.4 |
| S5.1.1 | Implement Lockout Service | 5 | medium | S1.1.7 |
| S5.1.2 | Implement Audit Service | 5 | small | S1.1.6 |
| S5.1.3 | Implement Rate Limiting | 5 | small | S2.1.5 |
| S5.1.4 | Implement Error Handling | 5 | medium | S5.1.1, S5.1.2, S5.1.3 |
| S5.1.5 | Implement Logging & Metrics | 5 | medium | S5.1.4 |
| S5.1.6 | Implement Event Publishing | 5 | medium | S2.1.2 |
| S5.1.7 | Implement Scheduled Jobs | 5 | small | S3.1.1 |

**Total Stories: 33** **Estimated Duration: 5-6 weeks**

---