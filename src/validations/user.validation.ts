import { z } from "zod";
import { accountNumberSchema } from "./common.validation.js";

export const loginSchema = z.object(
  {
    accountNumber: accountNumberSchema("El numero de cuenta es obligatorio")
  },
  { error: "El cuerpo de la peticion no es valido" }
);

export const logoutSchema = z.object(
  {
    accountNumber: accountNumberSchema("El numero de cuenta es invalido").optional()
  },
  { error: "El cuerpo de la peticion no es valido" }
);
