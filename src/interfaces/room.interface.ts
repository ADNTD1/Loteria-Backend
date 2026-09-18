export interface Room {
  id: string,
  hostAccountNumber: string,
  code: string,
  name: string,
  status: RoomStatus,
  maxPlayers: number,
  players: string[],
  createdAt: Date
}

export enum RoomStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

// Resumen público de una sala disponible, para la lista del lobby en tiempo real.
export interface RoomSummary {
  code: string,
  name: string,
  hostAccountNumber: string,
  players: number,
  maxPlayers: number
}
