import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

export const prismaSchemaPath = join(here, '..', 'prisma', 'schema.prisma');
