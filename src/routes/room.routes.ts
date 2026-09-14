import { Router } from "express";
import { createRoom, getRoomByCode, joinRoom } from "../controllers/room.controller.js";

const router = Router();

router.post('/', createRoom);

router.post('/join', joinRoom)

router.get('/:code', getRoomByCode)


export default router;
