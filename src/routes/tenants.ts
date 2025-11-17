import { Router } from 'express';
import { createTenant, deleteTenant, getTenantById, getTenantBySlug, listTenants, updateTenant } from '../controllers/tenantController';
import plansRouter from './plans';


const router = Router();

router.get('/', listTenants);

/**
 * GET /api/tenants/:id
 */
router.get('/:id', getTenantById);

/**
 * GET by slug (alternative route)
 * GET /api/tenants/slug/fitzone-gym
 */
router.get('/slug/:slug', getTenantBySlug);

/**
 * POST /api/tenants
 * body: { name, slug }
 */
router.post('/', createTenant);

/**
 * PUT /api/tenants/:id
 * body: { name?, slug? }
 */
router.put('/:id', updateTenant);

/**
 * DELETE /api/tenants/:id
 */
router.delete('/:id', deleteTenant);

router.use('/:tenantId/plans', plansRouter);

export default router;
