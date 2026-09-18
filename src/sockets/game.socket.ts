import type { Server, Socket } from "socket.io";
import { CardRepository } from "../repositories/card.repository.js";
import { assignBoardToPlayer, getBoardsForRoom } from "../services/board.service.js";
import { BoardOperations } from "../utils/board.operations.js";
import type { playerBoard } from "../interfaces/game.interface.js";
import { assertRoomHost, getRoomPlayers } from "../services/room.service.js";
import {
  startGame,
  claimVictory,
  getPublicState,
  stopGame,
  GameSessionError,
} from "../services/gameSession.service.js";
import { userChannel } from "./channels.js";

const cardRepository = new CardRepository();

type Ack = (response: { ok: boolean; data?: unknown; message?: string }) => void;

const ok = (ack: unknown, data?: unknown) => {
  if (typeof ack === "function") (ack as Ack)({ ok: true, data });
};

const fail = (ack: unknown, error: unknown) => {
  if (typeof ack === "function") {
    (ack as Ack)({
      ok: false,
      message: error instanceof Error ? error.message : "Error interno",
    });
  }
};

const requireCode = (code: unknown): string => {
  if (typeof code !== "string" || !code) throw new GameSessionError("Falta el código de sala");
  return code;
};

/**
 * Handlers de la partida. El accountNumber siempre sale del JWT del handshake,
 * así nadie puede cantar lotería o detener la partida haciéndose pasar por otro.
 */
export const registerGameHandlers = (io: Server, socket: Socket): void => {
  const accountNumber = socket.data.accountNumber as string;

  socket.on("game:start", async (payload: { code?: string }, ack: unknown) => {
    try {
      const code = requireCode(payload?.code);
      await assertRoomHost(code, accountNumber);

      const players = await getRoomPlayers(code);
      const allCards = await cardRepository.findAll();

      // RF-04: las tablas ya se asignaron cuando cada jugador se unio a la sala.
      // Aqui solo se recuperan; si alguno no tiene (caso raro), se le asigna ahora.
      const assigned = getBoardsForRoom(code);
      const boards: Record<string, playerBoard> = {};

      for (const player of players) {
        const board =
          assigned[player.accountNumber] ??
          (await assignBoardToPlayer(code, player.accountNumber));

        if (!BoardOperations.isValidBoard(board)) {
          fail(ack, new GameSessionError(`La tabla del jugador ${player.accountNumber} no es valida`));
          return;
        }

        boards[player.accountNumber] = board;
      }

      const session = await startGame(code, boards, allCards);

      // Cada jugador recibe SOLO su tablero por su canal personal.
      for (const [playerAccount, board] of Object.entries(boards)) {
        io.to(userChannel(playerAccount)).emit("game:board", board);
      }

      ok(ack, { roomCode: session.roomCode, status: session.status });
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("game:claim", async (payload: { code?: string }, ack: unknown) => {
    try {
      const code = requireCode(payload?.code);
      const result = await claimVictory(code, accountNumber);

      if (!result.won) {
        fail(ack, new GameSessionError("Reclamo inválido: aún no completas un patrón ganador"));
        return;
      }

      ok(ack, { winner: accountNumber, pattern: result.pattern });
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("game:stop", async (payload: { code?: string }, ack: unknown) => {
    try {
      const code = requireCode(payload?.code);
      await assertRoomHost(code, accountNumber);
      await stopGame(code);
      ok(ack);
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("game:state", (payload: { code?: string }, ack: unknown) => {
    try {
      const code = requireCode(payload?.code);
      ok(ack, getPublicState(code));
    } catch (error) {
      fail(ack, error);
    }
  });
};
