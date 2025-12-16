/**
 * ⚠️ GENERATED PACKAGE - MANUEL EDİT YASAK
 *
 * Bu içerik codegen için yer tutucudur. Gerçek client OpenAPI spec'inden üretilecektir.
 */
import type { HealthResponse } from '@project/api-dto';

const DEFAULT_BASE_URL = 'http://localhost:3000/api';

export async function getHealth(
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<HealthResponse> {
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}
