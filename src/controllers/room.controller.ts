import type { Request, Response } from "express";
import { RoomStatus, type Room } from "../interfaces/room.interface.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";

const activeRooms: Room[] = []; // esto es temporan, despues se implementa el bueno

export const createRoom = (req: Request, res: Response) => {
  const { hostAccountNumber } = req.body;

  if (!hostAccountNumber) {
    return res.status(400).json({
      ok: false,
      message: 'favor de autenticarse antes de entrar a la sala'
    });
  }

  const newRoom: Room = {
    id: `room-${Date.now()}`,
    hostAccountNumber,
    code: generateRoomCode(),
    status: RoomStatus.WAITING,
    players: [hostAccountNumber],
    createdAt: new Date()
  }

  activeRooms.push(newRoom);

  return res.status(201).json({
    ok: true,
    data: {
      message: newRoom
    }
  })

}

export const getRoomByCode = (req: Request, res: Response) => {

  const { code } = req.params;

  const room = activeRooms.find(r => r.code === code)

  if (!room) {
    res.status(400).json({
      ok: false,
      data: {
        message: `Sala con codigo: ${code} no encontrada`
      }
    });
  }

  return res.json({
    ok: true,
    data: room
  })
}
