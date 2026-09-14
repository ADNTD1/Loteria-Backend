import type { Request, Response } from "express";
import { CardRepository } from "../repositories/card.repository.js";


const cardRepository = new CardRepository();

const cards = await cardRepository.findAll();

export const getAllCards = (req: Request, res: Response) => {

  if (!cards) {
    res.status(400).json({
      ok: false,
      message: "no se encontraron cartas, revisa tu conexion a internet"
    })
  }

  return res.json({
    ok: true,
    data: cards
  })
}

export const getRandomBoard =  (req: Request, res: Response) => {

}
