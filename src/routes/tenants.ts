import { Router } from 'express';
import { createTenant, listTenants } from '../controllers/tenantController';

const router = Router();

router.post('/', createTenant);
router.get('/', listTenants);

export default router;
