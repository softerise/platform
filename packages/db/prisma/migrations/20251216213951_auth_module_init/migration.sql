/*
  Warnings:

  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('B2C', 'B2B');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "B2BRole" AS ENUM ('EMPLOYEE', 'TEAM_LEAD', 'HR_MANAGER', 'COMPANY_ADMIN');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IOS', 'ANDROID', 'WEB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SeniorityLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'TEXT');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('EMAIL', 'LINK');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BackofficeRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_AGENT', 'B2B_MANAGER', 'ANALYTICS_VIEWER');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE', 'EMAIL_CHANGE_REQUEST', 'EMAIL_CHANGE_COMPLETE', 'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED', 'B2B_JOIN', 'B2B_LEAVE', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'ACCOUNT_DELETE_REQUEST', 'ACCOUNT_DELETED', 'ADMIN_IMPERSONATE_START', 'ADMIN_IMPERSONATE_END', 'ONBOARDING_COMPLETED', 'ONBOARDING_UPDATED', 'GUEST_MERGE_COMPLETED');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropTable
DROP TABLE "Booking";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(128),
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMPTZ,
    "display_name" VARCHAR(100),
    "first_name" VARCHAR(50),
    "last_name" VARCHAR(50),
    "avatar_url" VARCHAR(500),
    "identity_provider" "IdentityProvider" NOT NULL DEFAULT 'EMAIL',
    "external_identity_id" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "user_type" "UserType" NOT NULL DEFAULT 'B2C',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" UUID,
    "b2b_role" "B2BRole",
    "b2b_joined_at" TIMESTAMPTZ,
    "persona_id" UUID,
    "onboarding_completed_at" TIMESTAMPTZ,
    "onboarding_updated_at" TIMESTAMPTZ,
    "preferred_language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(50),
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" VARCHAR(45),
    "password_changed_at" TIMESTAMPTZ,
    "merged_from_guest_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "device_fingerprint" VARCHAR(255),
    "device_type" "DeviceType" NOT NULL,
    "app_version" VARCHAR(20),
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merged_to_user_id" UUID,
    "merged_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "device_name" VARCHAR(100),
    "device_id" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "firebase_token_id" VARCHAR(255) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "revoked_reason" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "primary_goal" VARCHAR(200) NOT NULL,
    "target_seniority" "SeniorityLevel" NOT NULL,
    "icon_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_questions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "persona_weight" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "onboarding_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" VARCHAR(500),
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "seat_limit" INTEGER NOT NULL DEFAULT 10,
    "current_seat_count" INTEGER NOT NULL DEFAULT 0,
    "default_invite_code" VARCHAR(20) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_invites" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "invite_type" "InviteType" NOT NULL,
    "invite_code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "assigned_role" "B2BRole" NOT NULL DEFAULT 'EMPLOYEE',
    "invited_by_user_id" UUID NOT NULL,
    "personal_message" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_by_user_id" UUID,
    "accepted_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backoffice_admins" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "role" "BackofficeRole" NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "backoffice_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_audit_logs" (
    "id" UUID NOT NULL,
    "event_type" "AuthEventType" NOT NULL,
    "user_id" UUID,
    "admin_id" UUID,
    "target_user_id" UUID,
    "session_id" UUID,
    "ip_address_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "device_type" "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "success" BOOLEAN NOT NULL,
    "failure_reason" VARCHAR(200),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_lockouts" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_at" TIMESTAMPTZ,
    "locked_until" TIMESTAMPTZ,
    "lock_level" INTEGER NOT NULL DEFAULT 0,
    "requires_email_unlock" BOOLEAN NOT NULL DEFAULT false,
    "unlock_token" VARCHAR(100),
    "unlock_token_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "account_lockouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "booking_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_merged_from_guest_id_key" ON "users"("merged_from_guest_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_user_type_idx" ON "users"("user_type");

-- CreateIndex
CREATE INDEX "users_persona_id_idx" ON "users"("persona_id");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "guests_device_fingerprint_key" ON "guests"("device_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "guests_merged_to_user_id_key" ON "guests"("merged_to_user_id");

-- CreateIndex
CREATE INDEX "guests_device_fingerprint_idx" ON "guests"("device_fingerprint");

-- CreateIndex
CREATE INDEX "guests_expires_at_idx" ON "guests"("expires_at");

-- CreateIndex
CREATE INDEX "guests_merged_to_user_id_idx" ON "guests"("merged_to_user_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_status_idx" ON "user_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_status_idx" ON "user_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "personas_code_key" ON "personas"("code");

-- CreateIndex
CREATE INDEX "personas_is_active_idx" ON "personas"("is_active");

-- CreateIndex
CREATE INDEX "personas_code_idx" ON "personas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_questions_code_key" ON "onboarding_questions"("code");

-- CreateIndex
CREATE INDEX "onboarding_questions_is_active_display_order_idx" ON "onboarding_questions"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "onboarding_questions_code_idx" ON "onboarding_questions"("code");

-- CreateIndex
CREATE INDEX "onboarding_answers_user_id_idx" ON "onboarding_answers"("user_id");

-- CreateIndex
CREATE INDEX "onboarding_answers_question_id_idx" ON "onboarding_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_answers_user_id_question_id_is_current_key" ON "onboarding_answers"("user_id", "question_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_default_invite_code_key" ON "companies"("default_invite_code");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_invites_invite_code_key" ON "company_invites"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "company_invites_accepted_by_user_id_key" ON "company_invites"("accepted_by_user_id");

-- CreateIndex
CREATE INDEX "company_invites_company_id_idx" ON "company_invites"("company_id");

-- CreateIndex
CREATE INDEX "company_invites_invite_code_idx" ON "company_invites"("invite_code");

-- CreateIndex
CREATE INDEX "company_invites_email_idx" ON "company_invites"("email");

-- CreateIndex
CREATE INDEX "company_invites_status_idx" ON "company_invites"("status");

-- CreateIndex
CREATE INDEX "company_invites_expires_at_idx" ON "company_invites"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "backoffice_admins_firebase_uid_key" ON "backoffice_admins"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "backoffice_admins_email_key" ON "backoffice_admins"("email");

-- CreateIndex
CREATE INDEX "backoffice_admins_email_idx" ON "backoffice_admins"("email");

-- CreateIndex
CREATE INDEX "backoffice_admins_role_idx" ON "backoffice_admins"("role");

-- CreateIndex
CREATE INDEX "backoffice_admins_status_idx" ON "backoffice_admins"("status");

-- CreateIndex
CREATE INDEX "auth_audit_logs_user_id_idx" ON "auth_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_admin_id_idx" ON "auth_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "auth_audit_logs_event_type_idx" ON "auth_audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "auth_audit_logs_created_at_idx" ON "auth_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "auth_audit_logs_success_idx" ON "auth_audit_logs"("success");

-- CreateIndex
CREATE INDEX "auth_audit_logs_user_id_event_type_created_at_idx" ON "auth_audit_logs"("user_id", "event_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_lockouts_email_key" ON "account_lockouts"("email");

-- CreateIndex
CREATE INDEX "account_lockouts_email_idx" ON "account_lockouts"("email");

-- CreateIndex
CREATE INDEX "account_lockouts_locked_until_idx" ON "account_lockouts"("locked_until");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_booking_date_idx" ON "bookings"("booking_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_merged_from_guest_id_fkey" FOREIGN KEY ("merged_from_guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_answers" ADD CONSTRAINT "onboarding_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_answers" ADD CONSTRAINT "onboarding_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "onboarding_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invites" ADD CONSTRAINT "company_invites_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
