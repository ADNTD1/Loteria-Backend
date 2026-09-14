import { Router } from "express";

import { getAllCards, getRandomBoard, getShuffledDeck } from "../controllers/game.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();

router.get('/cards', 
	rateLimit({ windowMs: 60_000,limit: 100,}), 
	getAllCards);
router.post('/board', 
	rateLimit({ windowMs: 60_000,limit: 50,}),
	getRandomBoard);
router.get('/shuffle', 
	rateLimit({ windowMs: 60_000,limit: 20,}), 
	getShuffledDeck);

export default router;
