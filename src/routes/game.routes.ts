import { Router } from "express";

import { getAllCards, getRandomBoard, getShuffledDeck } from "../controllers/game.controller.js";

const router = Router();

router.get('/cards', getAllCards);
router.post('/board', getRandomBoard);
router.get('/shuffle', getShuffledDeck);

export default router;
