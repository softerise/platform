import { z } from 'zod';

// ============================================
// PRIMITIVE SCHEMAS (Reusable)
// ============================================

export const UserIdSchema = z.string().uuid();
export const BookingIdSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const UserRoleSchema = z.enum(['admin', 'user', 'guest']);
export const CurrencySchema = z.enum(['TRY', 'USD', 'EUR']);

// ============================================
// ENTITY SCHEMAS
// ============================================

/**
 * Core User entity
 *
 * ❌ DO NOT add UI validation messages here
 * ❌ DO NOT add i18n keys here
 * ❌ DO NOT add form labels here
 */
export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  role: UserRoleSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Booking entity
 */
export const BookingSchema = z.object({
  id: BookingIdSchema,
  userId: UserIdSchema,
  totalAmount: z.number().positive(),
  currency: CurrencySchema,
  bookingDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// DERIVED TYPES
// ============================================

export type UserId = z.infer<typeof UserIdSchema>;
export type BookingId = z.infer<typeof BookingIdSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Currency = z.infer<typeof CurrencySchema>;

export type User = z.infer<typeof UserSchema>;
export type Booking = z.infer<typeof BookingSchema>;

// ============================================
// PARTIAL / PICK SCHEMAS (for forms, updates)
// ============================================

export const UserCreateSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UserUpdateSchema = UserSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const BookingCreateSchema = BookingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const BookingUpdateSchema = BookingSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type BookingCreate = z.infer<typeof BookingCreateSchema>;
export type BookingUpdate = z.infer<typeof BookingUpdateSchema>;

// ============================================
// REQUEST/RESPONSE SHAPES
// ============================================

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
