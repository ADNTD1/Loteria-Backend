import type { Card } from "@prisma/client";

export interface Room {
  id: string,
  hostAccountNumber: string,
  code: string,
  status: RoomStatus,
  players: string[],
  createdAt: Date
}

export enum RoomStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface ActiveRoomState extends Room {
  deck: Card[];
  drawnCards: Card[];
}
