import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Softerise API')
    .setDescription(
      [
        '## Softerise Micro-Learning Platform API',
        '',
        '### Authentication',
        'Firebase Authentication kullanılır. Korunmuş endpoint\'ler için `Authorization: Bearer <firebase-id-token>` header\'ı gerekir.',
        '',
        '### Rate Limiting',
        '- Signup: 5 istek / saat',
        '- Login: 10 istek / 15 dakika',
        '- Genel API: 100 istek / dakika',
        '',
        '### Error Responses',
        'Tüm hatalar standart formatta döner.',
        '',
        '### User Status Flow',
        '`PENDING_VERIFICATION` → `PENDING_ONBOARDING` → `ACTIVE`',
        '',
        '### B2B Role Hierarchy',
        '`EMPLOYEE` < `TEAM_LEAD` < `HR_MANAGER` < `COMPANY_ADMIN`',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .setContact('Softerise', 'https://softerise.com', 'api@softerise.com')
    .setLicense('Proprietary', 'https://softerise.com/terms')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.softerise.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Firebase ID Token',
        in: 'header',
      },
      'firebase-auth',
    )
    .addTag('Auth', 'Authentication & user management')
    .addTag('Sessions', 'Session management')
    .addTag('Guest', 'Guest user tracking')
    .addTag('Onboarding', 'User onboarding flow')
    .addTag('B2B', 'B2B company & membership management')
    .addTag('Admin', 'Backoffice administration')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Softerise API Documentation',
  });
}

