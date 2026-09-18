import { Router } from "express";
import {
  startGameSession,
  getGameSessionState,
  claimGameVictory,
  stopGameSession,
} from "../controllers/gameSession.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js"
import { verifyRoomHost } from "../middlewares/roomHost.middleware.js"
import rateLimit from "express-rate-limit";

const router = Router();

router.post("/:code/start",
	rateLimit({ windowMs: 60_000,limit: 20,}), // 20 peticiones por minuto
	authenticateToken, verifyRoomHost, // verificar que solo el host pueda iniciar y terminar el juego usando el JWT
	startGameSession);
router.get("/:code/state",
	rateLimit({ windowMs: 60_000,limit: 30,}),
	authenticateToken,
	getGameSessionState);
router.post("/:code/claim",
	rateLimit({ windowMs: 60_000,limit: 50,}),
	authenticateToken,
	claimGameVictory);
router.post("/:code/stop",
	rateLimit({ windowMs: 60_000,limit: 20,}),
	authenticateToken, verifyRoomHost,
	stopGameSession);

export default router;
