import type { PrismaService } from '../../prisma/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = [
    'onboarding_answers',
    'user_sessions',
    'company_invites',
    'users',
    'guests',
    'companies',
    'personas',
    'onboarding_questions',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch {
      // Table might not exist
    }
  }
}

export async function seedTestData(prisma: PrismaService): Promise<void> {
  // Add seed data when needed
}

