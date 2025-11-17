// src/controllers/planController.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';


const parseIntSafe = (v: any) => {
  const n = Number(v);
  return Number.isNaN(n) ? undefined : Math.trunc(n);
};

/**
 * List plans for a tenant
 * GET /api/tenants/:tenantId/plans
 */
export const listPlans = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  try {
    const plans = await prisma.plan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(plans);
  } catch (err) {
    console.error('listPlans error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get plan by id (and ensure it belongs to tenant)
 * GET /api/tenants/:tenantId/plans/:planId
 */
export const getPlan = async (req: Request, res: Response) => {
  const { tenantId, planId } = req.params;
  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.tenantId !== tenantId) {
      return res.status(404).json({ message: 'Plan not found for this tenant' });
    }
    return res.json(plan);
  } catch (err) {
    console.error('getPlan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a plan for a tenant
 * POST /api/tenants/:tenantId/plans
 * body: { name, priceCents, currency?, interval?, active? }
 */
export const createPlan = async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { name, priceCents, currency, interval, active } = req.body;

  if (!name || typeof priceCents === 'undefined') {
    return res.status(400).json({ message: 'name and priceCents are required' });
  }

  try {
    // ensure tenant exists (clear error rather than DB constraint message)
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const plan = await prisma.plan.create({
      data: {
        tenantId,
        name: String(name).trim(),
        priceCents: parseIntSafe(priceCents) ?? 0,
        currency: currency ? String(currency).trim() : 'INR',
        interval: (interval as any) ?? 'MONTH',
        active: typeof active === 'boolean' ? active : true,
      },
    });

    return res.status(201).json(plan);
  } catch (err: any) {
    console.error('createPlan error', err);
    if (err?.code === 'P2002') {
      // unique constraint failure on tenantId+name
      return res.status(409).json({ message: 'A plan with this name already exists for the tenant' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a plan
 * PUT /api/tenants/:tenantId/plans/:planId
 */
export const updatePlan = async (req: Request, res: Response) => {
  const { tenantId, planId } = req.params;
  const { name, priceCents, currency, interval, active } = req.body;

  try {
    // fetch and check ownership
    const existing = await prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) return res.status(404).json({ message: 'Plan not found' });
    if (existing.tenantId !== tenantId) return res.status(404).json({ message: 'Plan not found for this tenant' });

    const data: any = {};
    if (typeof name !== 'undefined') data.name = String(name).trim();
    if (typeof priceCents !== 'undefined') data.priceCents = parseIntSafe(priceCents);
    if (typeof currency !== 'undefined') data.currency = String(currency).trim();
    if (typeof interval !== 'undefined') data.interval = interval;
    if (typeof active !== 'undefined') data.active = !!active;

    const updated = await prisma.plan.update({
      where: { id: planId },
      data,
    });

    return res.json(updated);
  } catch (err: any) {
    console.error('updatePlan error', err);
    if (err?.code === 'P2002') {
      return res.status(409).json({ message: 'A plan with this name already exists for the tenant' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a plan
 * DELETE /api/tenants/:tenantId/plans/:planId
 */
export const deletePlan = async (req: Request, res: Response) => {
  const { tenantId, planId } = req.params;
  try {
    const existing = await prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) return res.status(404).json({ message: 'Plan not found' });
    if (existing.tenantId !== tenantId) return res.status(404).json({ message: 'Plan not found for this tenant' });

    await prisma.plan.delete({ where: { id: planId } });
    return res.status(204).send();
  } catch (err) {
    console.error('deletePlan error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
