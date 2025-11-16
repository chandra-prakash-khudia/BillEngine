import 'dotenv/config';
import prisma from './lib/prisma';

async function main() {
  console.log('Seeding demo data...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fitzone-gym' },
    update: {},
    create: {
      name: 'FitZone Gym',
      slug: 'fitzone-gym'
    },
  });

  await prisma.plan.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Monthly' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Monthly',
      priceCents: 49900,
      interval: 'MONTH'
    }
  });

  await prisma.plan.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Yearly' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Yearly',
      priceCents: 499000,
      interval: 'YEAR'
    }
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
