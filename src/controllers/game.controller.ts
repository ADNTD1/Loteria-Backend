import type { Request, Response } from "express";
import { AppError } from "../errors/app.error.js";
import { CardRepository } from "../repositories/card.repository.js";
import { generateRandomBoard } from "../utils/generateRandomBoard.js";
import { shuffleDeck } from "../utils/suffle-deck.js";

const cardRepository = new CardRepository();

// Sin try/catch: cualquier error llega al middleware global (error.middleware.ts).

export const getAllCards = async (req: Request, res: Response) => {
  const cards = await cardRepository.findAll();

  if (cards.length === 0) {
    throw new AppError("No se encontraron cartas", 404);
  }

  return res.json({
    ok: true,
    data: cards
  });
};

// Ejemplo:
// 1) Haders: En Authorization pones Key y Value [Key]
// Nota: la key se es el token de sescion de /api/users/login:{accountNumber}
// 2) Json:
//    {
//      accountNumber: "12345666"
//    }
//
export const getRandomBoard = async (req: Request, res: Response) => {
  // En Express 5 req.body es undefined si no mandan un JSON.
  const { accountNumber } = req.body ?? {};

  if (!accountNumber) {
    throw new AppError("El accountNumber es obligatorio", 400);
  }

  const cards = await cardRepository.findAll();
  const board = generateRandomBoard(accountNumber, cards);

  return res.json({
    ok: true,
    data: board
  });
};


/**
 * Obtiene todas las cartas disponibles y devuelve un mazo barajado aleatoriamente.
 *
 * @route GET /api/cards/shuffle (ajusta según tu ruta real)
 * @param {Request} req - Objeto de solicitud de Express (no se usan parámetros en este caso).
 * @param {Response} res - Objeto de respuesta de Express.
 * @returns {Promise<Response>} Respuesta JSON con el mazo de cartas barajado.
 *
 * @throws {AppError} 404 - Si no se encuentran cartas en el repositorio.
 *
 * @example
 * // Respuesta exitosa (200)
 * {
 *   "ok": true,
 *   "data": [ { "id": 1, "name": "..." }, { "id": 2, "name": "..." }, ... ]
 * }
 *
 * @example
 * // Respuesta de error (404)
 * {
 *   "ok": false,
 *   "message": "No se encontraron cartas para barajear"
 * }
 */
export const getShuffledDeck = async (req: Request, res: Response) => {
  const cards = await cardRepository.findAll();

  if (cards.length === 0) {
    throw new AppError("No se encontraron cartas para barajear", 404);
  }

  const shuffledDeck = shuffleDeck(cards);

  return res.json({
    ok: true,
    data: shuffledDeck
  });
};
