import { Router } from "express";
import { createRoom, getRoomByCode } from "../controllers/room.controller.js";

const router = Router();

router.post('/', createRoom);

router.get('/:code', getRoomByCode)

export default router;
