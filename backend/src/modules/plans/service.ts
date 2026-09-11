import { prisma } from '@/lib/db';

export async function listPlans() {
  return prisma.plan.findMany({
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  });
}
