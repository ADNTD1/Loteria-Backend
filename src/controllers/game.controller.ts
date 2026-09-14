import type { Request, Response } from "express";
import { CardRepository } from "../repositories/card.repository.js";
import { generateRandomBoard } from "../utils/generateRandomBoard.js";
import { shuffleDeck } from "../utils/suffle-deck.js";

const cardRepository = new CardRepository();

export const getAllCards = async (req: Request, res: Response) => {
  try {
    const cards = await cardRepository.findAll();

    if (!cards || cards.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No se encontraron cartas"
      });
    }

    return res.json({
      ok: true,
      data: cards
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error al obtener las cartas"
    });
  }
};

export const getRandomBoard = async (req: Request, res: Response) => {
  try {

    const { accountNumber } = req.body;

    if (!accountNumber) {
      return res.status(400).json({
        ok: false,
        message: "El accountNumber es obligatorio"
      });
    }

    const cards = await cardRepository.findAll();
    const board = generateRandomBoard(accountNumber, cards);

    return res.json({
      ok: true,
      data: board
    });

  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error al generar la tabla"
    });
  }

};

export const getShuffledDeck = async (req: Request, res: Response) => {
  try {
    const cards = await cardRepository.findAll();

    if (!cards || cards.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No se encontraron cartas para barajear"
      });
    }


    const shuffledDeck = shuffleDeck(cards);

    return res.json({
      ok: true,
      data: shuffledDeck
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error al generar el mazo inicial"
    });
  }
};
