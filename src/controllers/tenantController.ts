import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function createTenant(req: Request, res: Response) {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name+slug required' });

  try {
    const tenant = await prisma.tenant.create({
      data: { name, slug },
    });
    res.json(tenant);
  } catch (err: any) {
    console.error(err);
    if (err?.code === 'P2002') return res.status(400).json({ error: 'slug must be unique' });
    res.status(500).json({ error: 'server error' });
  }
}

export async function listTenants(_req: Request, res: Response) {
  const tenants = await prisma.tenant.findMany();
  res.json(tenants);
}
