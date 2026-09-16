import { z } from "zod";
import { accountNumberSchema, roomCodeSchema } from "./common.validation.js";

export const roomCodeParamsSchema = z.object({
  code: roomCodeSchema
});

export const startGameSchema = z.object(
  {
    players: z
      .array(
        z
          .string({ error: "El numero de cuenta no puede estar vacio" })
          .trim()
          .min(1, "El numero de cuenta no puede estar vacio"),
        { error: "players debe ser un arreglo" }
      )
      .min(1, "Se requiere al menos un jugador")
  },
  { error: "El cuerpo de la peticion no es valido" }
);

export const claimVictorySchema = z.object(
  {
    accountNumber: accountNumberSchema("Falta el accountNumber del jugador")
  },
  { error: "El cuerpo de la peticion no es valido" }
);
