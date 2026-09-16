import { z } from "zod";
import { accountNumberSchema, roomCodeSchema } from "./common.validation.js";

export const createRoomSchema = z.object(
  {
    hostAccountNumber: accountNumberSchema("El numero de cuenta es requerido"),
    maxPlayers: z
      .number({ error: "maxPlayers debe ser un numero" })
      .int("maxPlayers debe ser un numero entero")
      .min(2, "La sala debe permitir al menos 2 jugadores")
  },
  { error: "El cuerpo de la peticion no es valido" }
);

export const joinRoomSchema = z.object(
  {
    code: roomCodeSchema,
    accountNumber: accountNumberSchema("El numero de cuenta es requerido")
  },
  { error: "El cuerpo de la peticion no es valido" }
);

export const roomCodeParamsSchema = z.object({
  code: roomCodeSchema
});
