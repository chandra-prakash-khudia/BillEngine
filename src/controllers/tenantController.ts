
// src/controllers/tenantsController.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const listTenants = async (_req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(tenants);
  } catch (err) {
    console.error('listTenants error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getTenantById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    return res.json(tenant);
  } catch (err) {
    console.error('getTenantById error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getTenantBySlug = async (req: Request, res: Response) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug }
    });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    return res.json(tenant);
  } catch (err) {
    console.error('getTenantBySlug error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ message: 'name and slug are required' });
  }

  try {
    // basic slug sanitization  — ensure lowercase, dashed
    const normalizedSlug = String(slug).toLowerCase().trim();

    const existing = await prisma.tenant.findUnique({
      where: { slug: normalizedSlug }
    });
    if (existing) {
      return res.status(409).json({ message: 'Tenant slug already exists' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, slug: normalizedSlug }
    });
    return res.status(201).json(tenant);
  } catch (err) {
    console.error('createTenant error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, slug } = req.body;

  if (!name && !slug) {
    return res.status(400).json({ message: 'Provide at least one field to update (name or slug)' });
  }

  try {
   
    if (slug) {
      const normalizedSlug = slug.toLowerCase().trim();
      const existing = await prisma.tenant.findUnique({
        where: { slug: normalizedSlug }
      });
      if (existing && existing.id !== id) {
        return res.status(409).json({ message: 'Slug already taken' });
      }
    }
    const normalizedSlug = slug.toLowerCase().trim();
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug: normalizedSlug } : {})
      }
    });

    return res.json(updated);
  } catch (err: any) {
    console.error('updateTenant error', err);
    if (err.code === 'P2025') {
      // Prisma record not found error code (update/delete)
      return res.status(404).json({ message: 'Tenant not found' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.tenant.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: any) {
    console.error('deleteTenant error', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};
