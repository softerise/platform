import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

export interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
}

@Injectable()
export class FirebaseStrategy {
  private readonly logger = new Logger(FirebaseStrategy.name);

  async validateToken(_token: string): Promise<FirebaseUser> {
    try {
      // TODO: Implement with Firebase Admin SDK
      this.logger.warn('Firebase token validation not implemented');
      throw new UnauthorizedException('Token validation not implemented');
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}

