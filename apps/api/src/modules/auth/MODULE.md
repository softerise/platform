# Auth Module

## Amaç
Kullanıcı kimlik doğrulama, oturum yönetimi, misafir takibi, onboarding, B2B şirket/davet yönetimi ve backoffice admin işlemlerini yönetir.

## 8-File Structure
```
modules/auth/
├── auth.module.ts       → NestJS module definition
├── auth.controller.ts   → All HTTP endpoints
├── auth.service.ts      → All business logic
├── auth.repository.ts   → All database operations
├── auth.dto.ts          → All Zod schemas + types
├── auth.events.ts       → All domain events
├── auth.spec.ts         → All tests
└── MODULE.md            → This file
```

## Endpoints

### Authentication
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | /auth/signup | Public | Yeni kullanıcı kaydı |
| POST | /auth/login | Public | Kullanıcı girişi |
| POST | /auth/logout | Yes | Oturum kapatma |
| POST | /auth/refresh | Public | Token yenileme |
| POST | /auth/verify-email | Public | Email doğrulama |
| POST | /auth/forgot-password | Public | Şifre sıfırlama isteği |
| POST | /auth/reset-password | Public | Şifre sıfırlama |
| POST | /auth/change-password | Yes | Şifre değiştirme |

### Profile
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | /auth/profile | Yes | Profil bilgileri |
| PATCH | /auth/profile | Yes | Profil güncelleme |
| DELETE | /auth/account | Yes | Hesap silme |

### Sessions
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | /auth/sessions | Yes | Aktif oturumlar |
| DELETE | /auth/sessions/:id | Yes | Oturum sonlandırma |
| POST | /auth/sessions/revoke-all | Yes | Tüm oturumları sonlandırma |

### Guest
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | /auth/guest | Public | Misafir oluşturma |
| GET | /auth/guest/:id | Public | Misafir bilgisi |
| POST | /auth/guest/merge | Yes | Misafir birleştirme |

### Onboarding
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| GET | /auth/onboarding/questions | Public | Onboarding soruları |
| GET | /auth/onboarding/progress | Yes | Onboarding durumu |
| POST | /auth/onboarding/submit | Yes | Cevap gönderme |
| GET | /auth/personas | Public | Persona listesi |

### B2B - Company
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | /auth/company | Yes | Şirket oluşturma |
| GET | /auth/company/:id | Yes | Şirket bilgisi |
| PATCH | /auth/company/:id | Yes | Şirket güncelleme |
| GET | /auth/company/:id/members | Yes | Üye listesi |
| POST | /auth/company/join | Yes | Şirkete katılma |
| POST | /auth/company/leave | Yes | Şirketten ayrılma |
| PATCH | /auth/company/:id/members/role | Yes | Üye rolü güncelleme |
| DELETE | /auth/company/:id/members/:userId | Yes | Üye çıkarma |

### B2B - Invites
| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | /auth/company/:id/invites | Yes | Davet oluşturma |
| GET | /auth/company/:id/invites | Yes | Davet listesi |
| DELETE | /auth/company/:id/invites/:inviteId | Yes | Davet iptal |

### Admin
| Method | Path | Auth | Roles | Açıklama |
|--------|------|------|-------|----------|
| POST | /auth/admin | Yes | SUPER_ADMIN, B2B_MANAGER | Admin oluşturma |
| GET | /auth/admin/:id | Yes | SUPER_ADMIN, B2B_MANAGER | Admin bilgisi |
| PATCH | /auth/admin/:id | Yes | SUPER_ADMIN | Admin güncelleme |
| GET | /auth/admins | Yes | SUPER_ADMIN, B2B_MANAGER | Admin listesi |
| POST | /auth/admin/users/:id/suspend | Yes | SUPER_ADMIN, SUPPORT_AGENT | Kullanıcı askıya alma |
| POST | /auth/admin/users/:id/reactivate | Yes | SUPER_ADMIN, SUPPORT_AGENT | Kullanıcı aktifleştirme |
| POST | /auth/admin/impersonate | Yes | SUPER_ADMIN | Kullanıcı kimliğine bürünme |
| POST | /auth/admin/impersonate/end | Yes | SUPER_ADMIN | Kimliğe bürünmeyi sonlandırma |

## Database Models
- User
- UserSession
- Guest
- Persona
- OnboardingQuestion
- OnboardingAnswer
- Company
- CompanyInvite
- BackofficeAdmin
- AuthAuditLog
- AccountLockout

## Events
| Event | Payload | Açıklama |
|-------|---------|----------|
| user.created | { id, email } | Yeni kullanıcı |
| user.logged_in | { userId, sessionId } | Giriş yapıldı |
| user.logged_out | { userId, sessionId } | Çıkış yapıldı |
| session.revoked | { userId, sessionId } | Oturum sonlandırıldı |
| guest.created | { id, deviceType } | Misafir oluşturuldu |
| guest.merged | { guestId, userId } | Misafir birleştirildi |
| onboarding.completed | { userId, personaId } | Onboarding tamamlandı |
| company.created | { id, name, createdByUserId } | Şirket oluşturuldu |
| user.joined_company | { userId, companyId, role } | Şirkete katıldı |
| user.left_company | { userId, companyId } | Şirketten ayrıldı |
| invite.created | { inviteId, companyId, inviteType, email } | Davet oluşturuldu |
| invite.accepted | { inviteId, userId, companyId } | Davet kabul edildi |
| admin.created | { id, email, role } | Admin oluşturuldu |

## Business Rules
1. Email benzersiz olmalı
2. Şifre minimum 8 karakter
3. 3 başarısız giriş → 5 dk kilitleme
4. 5 başarısız giriş → 30 dk kilitleme
5. 10+ başarısız giriş → Email ile kilit açma gerekli
6. Şirket seat limiti aşılamaz
7. Davet süresi dolabilir
8. Admin rolü SUPER_ADMIN tarafından verilebilir
9. Soft delete uygulanır (deletedAt)

## Dependencies
- @project/contracts/auth (interfaces)
- @project/schemas (shared schemas)
- _core module (Prisma, guards, decorators)
- EventEmitter2 (cross-module events)
- Firebase Admin SDK (TODO: authentication)

## Test Coverage
- Integration: All endpoints
- Contract: Response schemas
- Unit: Business logic (lockout, persona calculation)

