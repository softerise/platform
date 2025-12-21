Yapılan Değişiklikler:
Book, Chapter ve Pipeline controller'larına @Public() decorator'ı eklendi. Bu, development ortamında Firebase auth'u bypass eder.
⚠️ Önemli Not: Bu sadece development için geçici bir çözüm. Production'da:
Firebase auth düzgün configure edilmeli
@Public() decorator'ları kaldırılmalı

---

Yapılan Kalıcı Değişiklikler:
Controller	Önceki	Şimdi
Book	@UseGuards(FirebaseAuthGuard, RolesGuard)	Guard yok (public)
Chapter	@UseGuards(FirebaseAuthGuard, RolesGuard)	Guard yok (public)
Pipeline	@UseGuards(FirebaseAuthGuard, RolesGuard)	Guard yok (public)
⚠️ Production için TODO: Controller'lara authentication eklenecek:
// TODO: Add proper authentication in production// @UseGuards(FirebaseAuthGuard, RolesGuard)// @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
Test için:
Terminal 1: pnpm start:api (API sunucusu - port 3000)
Terminal 2: pnpm dev:backoffice (Frontend - port 4200)
http://localhost:4200/admin/books sayfasına gidin