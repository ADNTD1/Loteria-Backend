import { Router } from "express";
import { createRoom, getRoomByCode, joinRoom } from "../controllers/room.controller.js";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { validateBody, validateParams } from "../middlewares/validation.middleware.js";
import { createRoomSchema, joinRoomSchema, roomCodeParamsSchema } from "../validations/room.validation.js";

const router = Router();

router.post('/',
	rateLimit({ windowMs: 60_000,limit: 30,}),
	//authenticateToken,
	validateBody(createRoomSchema),
	createRoom);

router.post('/join',
	rateLimit({ windowMs: 60_000,limit: 40,}),
	//authenticateToken,
	validateBody(joinRoomSchema),
	joinRoom)

router.get('/:code',
	rateLimit({ windowMs: 60_000,limit: 40,}),
	validateParams(roomCodeParamsSchema),
	getRoomByCode)


export default router;
