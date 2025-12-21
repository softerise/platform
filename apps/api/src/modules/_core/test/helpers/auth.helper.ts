export interface TestUser {
  id: string;
  email: string;
  role: string;
}

export async function createTestUser(
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  };
}

export async function createAuthToken(options?: {
  role?: string;
}): Promise<string> {
  return `test-token-${options?.role ?? 'user'}`;
}

