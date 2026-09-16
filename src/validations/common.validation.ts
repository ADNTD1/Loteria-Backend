import { z } from "zod";

export const accountNumberSchema = (message: string) =>
  z.union([z.string(message).trim(), z.number()], { error: message })
    .transform((value) => String(value).trim())
    .refine((value) => value.length > 0, message);

export const roomCodeSchema = z
  .string("Codigo de sala invalido")
  .trim()
  .regex(/^[A-Z]{3}-[A-Z0-9]{3}$/, "Codigo de sala invalido");
