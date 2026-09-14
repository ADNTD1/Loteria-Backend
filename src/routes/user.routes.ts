import { Router } from 'express';
import { getUserByAccountNumber } from '../controllers/user.controller.js';

const router = Router();

router.get('/auth/:accountNumber', getUserByAccountNumber);

export default router;
