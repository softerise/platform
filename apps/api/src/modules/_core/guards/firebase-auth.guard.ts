import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

type BackofficeAdminStatus = 'ACTIVE' | 'SUSPENDED';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);
  private app: App | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request.headers.authorization);
    const decoded = await this.verifyToken(token);
    const admin = await this.findAdmin(decoded.uid);

    if (admin.status === 'SUSPENDED') {
      throw new ForbiddenException({ error: 'AUTH-004', message: 'Account suspended' });
    }

    request.user = {
      uid: admin.id,
      firebaseUid: admin.firebaseUid,
      email: admin.email,
      role: admin.role,
      displayName: admin.displayName,
    };

    return true;
  }

  private extractBearerToken(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: 'AUTH-001', message: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException({ error: 'AUTH-001', message: 'Authentication required' });
    }
    return token;
  }

  private async verifyToken(idToken: string): Promise<DecodedIdToken> {
    try {
      const auth = this.getFirebaseAuth();
      const decoded = await auth.verifyIdToken(idToken, true);
      this.logger.debug?.(`Firebase token verified for uid=${decoded.uid}`);
      return decoded;
    } catch (error) {
      this.logger.warn(`Firebase token verification failed: ${error}`);
      throw new UnauthorizedException({ error: 'AUTH-002', message: 'Invalid or expired token' });
    }
  }

  private async findAdmin(firebaseUid: string) {
    const admin = await this.prisma.backofficeAdmin.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        role: true,
        displayName: true,
        status: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException({ error: 'AUTH-003', message: 'Admin account not found' });
    }

    return admin as typeof admin & { status: BackofficeAdminStatus };
  }

  private getFirebaseAuth() {
    if (!this.app) {
      if (getApps().length > 0) {
        this.app = getApps()[0];
      } else {
        const credentials = this.loadServiceAccount();
        this.app = initializeApp({
          credential: cert(credentials),
        });
        this.logger.debug?.('Firebase app initialized with provided credentials');
      }
    }
    return getAuth(this.app);
  }

  private loadServiceAccount() {
    const fromEnvJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
    const fromPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    // Priority: full JSON env → path → discrete vars
    if (fromEnvJson) {
      const parsed = JSON.parse(fromEnvJson);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      this.logger.debug?.('Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT');
      return parsed;
    }

    if (fromPath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const content = fs.readFileSync(fromPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      this.logger.debug?.(`Firebase credentials loaded from path ${fromPath}`);
      return parsed;
    }

    if (projectId && clientEmail && privateKey) {
      const normalizedKey = privateKey.replace(/\\n/g, '\n');
      this.logger.debug?.('Firebase credentials built from discrete env vars');
      return {
        project_id: projectId,
        client_email: clientEmail,
        private_key: normalizedKey,
      };
    }

    this.logger.error('Firebase credentials missing (service account env/path or discrete vars)');
    throw new UnauthorizedException({ error: 'AUTH-002', message: 'Invalid or expired token' });
  }
}

