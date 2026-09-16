import { Router } from "express";
import {
  startGameSession,
  getGameSessionState,
  claimGameVictory,
  stopGameSession,
} from "../controllers/gameSession.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { validateBody, validateParams } from "../middlewares/validation.middleware.js";
import { claimVictorySchema, roomCodeParamsSchema, startGameSchema } from "../validations/gameSession.validation.js";
import rateLimit from "express-rate-limit";

const router = Router();

router.post("/:code/start", // falta verificar que solo el host pueda hacer estas acciones
	rateLimit({ windowMs: 60_000,limit: 20,}), // 20 peticiones por minuto
	validateParams(roomCodeParamsSchema),
	validateBody(startGameSchema),
	startGameSession);
router.get("/:code/state",
	rateLimit({ windowMs: 60_000,limit: 30,}),
	validateParams(roomCodeParamsSchema),
	getGameSessionState);
router.post("/:code/claim",
	rateLimit({ windowMs: 60_000,limit: 50,}),
	validateParams(roomCodeParamsSchema),
	validateBody(claimVictorySchema),
	claimGameVictory);
router.post("/:code/stop",
	rateLimit({ windowMs: 60_000,limit: 20,}),
	validateParams(roomCodeParamsSchema),
	stopGameSession);

export default router;
