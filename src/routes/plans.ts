import express from 'express'
import { createPlan, deletePlan, getPlan, listPlans, updatePlan } from '../controllers/plansController'
const router = express.Router({mergeParams:true})


router.get('/', listPlans);
router.post('/', createPlan);
router.get('/:planId', getPlan);
router.put('/:planId', updatePlan);
router.delete('/:planId', deletePlan);
export default router