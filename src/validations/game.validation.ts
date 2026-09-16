import { z } from "zod";
import { accountNumberSchema } from "./common.validation.js";

export const boardSchema = z.object(
  {
    accountNumber: accountNumberSchema("El accountNumber es obligatorio")
  },
  { error: "El cuerpo de la peticion no es valido" }
);
