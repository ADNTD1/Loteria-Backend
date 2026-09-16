import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/app.error.js";

export const validateBody = (schema: ZodType): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const issue = result.error.issues[0];
      throw new AppError(issue?.message ?? "Datos invalidos", 400);
    }

    req.body = result.data;
    next();
  };

export const validateParams = (schema: ZodType): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const issue = result.error.issues[0];
      throw new AppError(issue?.message ?? "Parametros invalidos", 400);
    }

    next();
  };
