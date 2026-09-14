import { Router } from "express";

import { getAllCards } from "../controllers/game.controller.js";

const router = Router();

router.get('/cards', getAllCards);

export default router;
