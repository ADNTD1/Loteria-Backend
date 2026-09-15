import { Router } from "express";
import {
  startGameSession,
  getGameSessionState,
  claimGameVictory,
  stopGameSession,
} from "../controllers/gameSession.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js"
import rateLimit from "express-rate-limit";

const router = Router();

router.post("/:code/start", // falta verificar que solo el host pueda hacer estas acciones
	rateLimit({ windowMs: 60_000,limit: 20,}), // 20 peticiones por minuto
	startGameSession);
router.get("/:code/state", 
	rateLimit({ windowMs: 60_000,limit: 30,}), 
	getGameSessionState);
router.post("/:code/claim", 
	rateLimit({ windowMs: 60_000,limit: 50,}), 
	claimGameVictory);
router.post("/:code/stop", 
	rateLimit({ windowMs: 60_000,limit: 20,}), 
	stopGameSession);

export default router;
