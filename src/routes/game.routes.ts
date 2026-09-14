import { Router } from "express";

import { getAllCards, getRandomBoard } from "../controllers/game.controller.js";

const router = Router();

router.get('/cards', getAllCards);
router.post('/board', getRandomBoard);

export default router;
