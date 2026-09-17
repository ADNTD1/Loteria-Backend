import { Router } from "express";

import { getAllCards, getRandomBoard, getShuffledDeck } from "../controllers/game.controller.js";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.middleware.js"

const router = Router();

router.get('/cards',
	rateLimit({ windowMs: 60_000,limit: 100,}), // 100 peticiones por minuto
	authenticateToken,
	getAllCards);
router.post('/board',
	rateLimit({ windowMs: 60_000,limit: 50,}), // 50 peticiones por minuto
	authenticateToken,
	getRandomBoard);

// esto sera llamado por el host al iniciar la partida para mezclar la baraja
router.get('/shuffle',
	rateLimit({ windowMs: 60_000,limit: 20,}), // 20 peticiones por minuto
	authenticateToken,
	getShuffledDeck);

export default router;
