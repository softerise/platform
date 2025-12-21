import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

// Decorator support for backward compatibility
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);
    const now = Date.now();

    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {
        windowMs: 60 * 1000,
        max: 100,
      };

    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + options.windowMs });
      return true;
    }

    if (entry.count >= options.max) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count++;
    return true;
  }

  private getKey(request: any): string {
    return request.ip || request.headers['x-forwarded-for'] || 'unknown';
  }
}

// Preconfigured helpers (no-op metadata wrappers)
export const LoginRateLimit = () =>
  RateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
export const SignupRateLimit = () =>
  RateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
export const PasswordResetRateLimit = () =>
  RateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
export const ApiRateLimit = () => RateLimit({ windowMs: 60 * 1000, max: 100 });

