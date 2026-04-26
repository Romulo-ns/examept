require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.subscription.deleteMany({});
  await prisma.user.updateMany({
    data: { plan: 'FREE' }
  });
  console.log("Reset feito com sucesso! Todos os utilizadores estão no plano FREE.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
