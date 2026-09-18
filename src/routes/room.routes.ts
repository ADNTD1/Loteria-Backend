import { Router } from "express";
import { createRoom, getRoomByCode, joinRoom } from "../controllers/room.controller.js";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.middleware.js"

const router = Router();

router.post('/',
	rateLimit({ windowMs: 60_000,limit: 30,}),
	authenticateToken,
	createRoom);

router.post('/join',
	rateLimit({ windowMs: 60_000,limit: 40,}),
	authenticateToken,
	joinRoom)

router.get('/:code', 
	rateLimit({ windowMs: 60_000,limit: 40,}),
	getRoomByCode)


export default router;
