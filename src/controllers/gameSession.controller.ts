import type { Request, Response } from "express";
import { CardRepository } from "../repositories/card.repository.js";
import { generateRandomBoard } from "../utils/generateRandomBoard.js";
import type { playerBoard } from "../interfaces/game.interface.js";
import { AliasesStore } from "../state/aliases.store.js";
import {
  startGame,
  claimVictory,
  getPublicState,
  stopGame,
  GameSessionError,
} from "../services/gameSession.service.js";

const cardRepository = new CardRepository();

// POST /api/game-session/:code/start
// body: { players: string[] } -> accountNumbers de los jugadores en la sala
export const startGameSession = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { players } = req.body as { players: string[] };

    if (!code) {
      return res.status(400).json({ ok: false, message: "Falta el código de sala" });
    }

    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ ok: false, message: "Se requiere al menos un jugador" });
    }

    const allCards = await cardRepository.findAll();

    const boards: Record<string, playerBoard> = {};
    for (const accountNumber of players) {
      boards[accountNumber] = generateRandomBoard(accountNumber, allCards);
    }

    const session = startGame(code, boards, allCards);

    return res.status(201).json({
      ok: true,
      data: {
        roomCode: session.roomCode,
        status: session.status,
        boards, // el front reparte cada tabla a su dueño
      },
    });
  } catch (error: any) {
    if (error instanceof GameSessionError) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: error.message || "Error al iniciar la partida" });
  }
};

// GET /api/game-session/:code/state
export const getGameSessionState = (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    if (!code) return res.status(400).json({ ok: false, message: "Falta el código de sala" });

    const state = getPublicState(code);
    return res.json({ ok: true, data: state });
  } catch (error: any) {
    if (error instanceof GameSessionError) {
      return res.status(404).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: error.message || "Error al consultar la partida" });
  }
};

// POST /api/game-session/:code/claim
// body: { accountNumber: string }  -> el jugador grita "¡Lotería!"
export const claimGameVictory = (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { accountNumber } = req.body as { accountNumber: string };

    if (!code) return res.status(400).json({ ok: false, message: "Falta el código de sala" });
    if (!accountNumber) {
      return res.status(400).json({ ok: false, message: "Falta el accountNumber del jugador" });
    }

    const result = claimVictory(code, accountNumber);

    if (!result.won) {
      return res.status(400).json({
        ok: false,
        message: "Reclamo inválido: aún no completas un patrón ganador",
      });
    }

    const winnerAlias = AliasesStore.get(code, accountNumber) ?? accountNumber;

    return res.json({
      ok: true,
      message: `¡Lotería válida! Ganó ${winnerAlias}`,
      data: { winner: accountNumber, winnerAlias, pattern: result.pattern },
    });
    
  } catch (error: any) {
    if (error instanceof GameSessionError) {
      return res.status(400).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: error.message || "Error al validar la victoria" });
  }
};

// POST /api/game-session/:code/stop
export const stopGameSession = (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    if (!code) return res.status(400).json({ ok: false, message: "Falta el código de sala" });

    stopGame(code);
    return res.json({ ok: true, message: "Partida detenida" });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message || "Error al detener la partida" });
  }
};