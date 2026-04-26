import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany();
  console.log(JSON.stringify(subs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
