import { Router } from "express";
import {
  startGameSession,
  getGameSessionState,
  claimGameVictory,
  stopGameSession,
} from "../controllers/gameSession.controller.js";

const router = Router();

router.post("/:code/start", startGameSession);
router.get("/:code/state", getGameSessionState);
router.post("/:code/claim", claimGameVictory);
router.post("/:code/stop", stopGameSession);

export default router;