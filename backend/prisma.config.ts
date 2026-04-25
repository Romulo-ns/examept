import path from 'node:path';
import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

// Load environment variables for Prisma CLI commands
dotenv.config();

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
