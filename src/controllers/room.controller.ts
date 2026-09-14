import type { Request, Response } from "express";
import { RoomStatus, type Room } from "../interfaces/room.interface.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { stringify } from "querystring";

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

export const joinRoom = (req: Request, res: Response) => {
  const { code, accountNumber } = req.body;

  if (!accountNumber || !code ) {
    res.status(400).json({
      ok: false,
      data: {
        message: "Debes de haberte identificado antes de ingresar a una sala",
        code: code,
        cuenta: accountNumber
      }
    });
  }

  const room = activeRooms.find(r => r.code == code);

  if (!room) {
    res.status(404).json({
      ok: false,
      data: {
       message: "la sala especificada no fue encontrada"
      }
    });
  }

  if (room?.status !== RoomStatus.WAITING) {
    res.status(400).json({
      ok: false,
      data: {
        message: "la partida de la sala ya comenzo"
      }
    })
  }


  if (!room.players.includes(accountNumber)) {
    room.players.push(accountNumber)
  }

  return res.json({
    ok: true,
    message: "te has unido exitosamente",
    data: room
  })


}
