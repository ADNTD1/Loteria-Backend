import { Router } from "express";

import { getAllCards, getRandomBoard, getShuffledDeck } from "../controllers/game.controller.js";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { validateBody } from "../middlewares/validation.middleware.js";
import { boardSchema } from "../validations/game.validation.js";

const router = Router();

router.get('/cards',
	rateLimit({ windowMs: 60_000,limit: 100,}), // 100 peticiones por minuto
	authenticateToken,
	getAllCards);
router.post('/board',
	rateLimit({ windowMs: 60_000,limit: 50,}), // 50 peticiones por minuto
	authenticateToken,
	validateBody(boardSchema),
	getRandomBoard);
router.get('/shuffle',
	rateLimit({ windowMs: 60_000,limit: 20,}), // 20 peticiones por minuto
	authenticateToken,
	getShuffledDeck);

export default router;
