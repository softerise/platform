import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app/app.module';
import { PrismaService } from '../_core';

describe('[Auth]', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.authAuditLog.deleteMany();
    await prisma.onboardingAnswer.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.companyInvite.deleteMany();
    await prisma.user.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.company.deleteMany();
    await prisma.accountLockout.deleteMany();
  });

  // ============================================================================
  // INTEGRATION: Authentication
  // ============================================================================
  describe('Integration: POST /auth/signup', () => {
    it('creates user with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Test1234!',
          displayName: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
    });

    it('returns 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Test1234!',
        });

      expect(response.status).toBe(400);
    });

    it('returns 409 for duplicate email', async () => {
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          status: 'ACTIVE',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'Test1234!',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Integration: POST /auth/login', () => {
    it('returns 401 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234!',
        });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // INTEGRATION: Guest
  // ============================================================================
  describe('Integration: POST /auth/guest', () => {
    it('creates guest with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/guest')
        .send({
          deviceType: 'WEB',
          deviceFingerprint: 'test-fingerprint-123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.deviceType).toBe('WEB');
    });

    it('returns existing guest for same fingerprint', async () => {
      const first = await request(app.getHttpServer())
        .post('/auth/guest')
        .send({
          deviceType: 'WEB',
          deviceFingerprint: 'same-fingerprint',
        });

      const second = await request(app.getHttpServer())
        .post('/auth/guest')
        .send({
          deviceType: 'WEB',
          deviceFingerprint: 'same-fingerprint',
        });

      expect(first.body.id).toBe(second.body.id);
    });
  });

  // ============================================================================
  // INTEGRATION: Onboarding
  // ============================================================================
  describe('Integration: GET /auth/onboarding/questions', () => {
    it('returns questions list', async () => {
      const response = await request(app.getHttpServer()).get('/auth/onboarding/questions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Integration: GET /auth/personas', () => {
    it('returns personas list', async () => {
      const response = await request(app.getHttpServer()).get('/auth/personas');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================================================
  // CONTRACT: Response Schemas
  // ============================================================================
  describe('Contract: Signup response', () => {
    it('matches expected schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'schema-test@example.com',
          password: 'Test1234!',
        });

      expect(response.body).toMatchObject({
        user: {
          id: expect.any(String),
          email: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });
  });

  describe('Contract: Guest response', () => {
    it('matches expected schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/guest')
        .send({ deviceType: 'IOS' });

      expect(response.body).toMatchObject({
        id: expect.any(String),
        deviceType: 'IOS',
        firstSeenAt: expect.any(String),
        lastSeenAt: expect.any(String),
        expiresAt: expect.any(String),
      });
    });
  });

  describe('Contract: Error response', () => {
    it('matches expected schema on validation error', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid' });

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.any(String),
      });
    });
  });

  // ============================================================================
  // UNIT: Business Logic
  // ============================================================================
  describe('Unit: Lockout logic', () => {
    it('should track failed login attempts', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'lockout-test@example.com',
            password: 'wrong',
          });
      }

      const lockout = await prisma.accountLockout.findUnique({
        where: { email: 'lockout-test@example.com' },
      });

      expect(lockout).toBeTruthy();
      expect(lockout?.failedAttempts).toBe(3);
      expect(lockout?.lockedUntil).toBeTruthy();
    });
  });
});

