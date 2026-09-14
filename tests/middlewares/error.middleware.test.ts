import express, { type Request, type RequestHandler, type Response } from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { AppError } from "../../src/errors/app.error.js";
import { errorHandler, notFoundHandler } from "../../src/middlewares/error.middleware.js";

const CLIENT_VERSION = "6.19.3";

// App mínima con una sola ruta que ejecuta el handler de cada prueba.
const buildApp = (handler: RequestHandler) => {
  const app = express();
  app.use(express.json({ limit: "1kb" }));
  app.all("/test", handler);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

const throwing = (error: unknown): RequestHandler => () => {
  throw error;
};

const prismaKnownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Detalle interno de Prisma", {
    code,
    clientVersion: CLIENT_VERSION
  });

describe("errorHandler", () => {
  let consoleError: MockInstance;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("responde con el status y el mensaje de un AppError", async () => {
    const app = buildApp(throwing(new AppError("La sala no existe", 404)));

    const res = await request(app).get("/test");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, message: "La sala no existe" });
  });

  it("atrapa errores lanzados en controladores async", async () => {
    const app = buildApp(async () => {
      await Promise.resolve();
      throw new AppError("La partida ya comenzó", 409);
    });

    const res = await request(app).get("/test");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ ok: false, message: "La partida ya comenzó" });
  });

  it("responde 500 genérico sin exponer el error original", async () => {
    const app = buildApp(throwing(new Error("password=secreto en C:\\ruta\\interna")));

    const res = await request(app).get("/test");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, message: "Error interno del servidor" });
    expect(res.text).not.toContain("secreto");
  });

  it("registra en consola los errores 5xx", async () => {
    const error = new Error("Bug inesperado");
    const app = buildApp(throwing(error));

    await request(app).get("/test");

    expect(consoleError).toHaveBeenCalledWith("[GET /test]", error);
  });

  it("no registra en consola los errores 4xx", async () => {
    const app = buildApp(throwing(new AppError("Datos inválidos", 400)));

    await request(app).get("/test");

    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    ["P2002", 409, "El registro ya existe"],
    ["P2003", 400, "El registro relacionado no existe"],
    ["P2025", 404, "El registro no fue encontrado"]
  ])("traduce el error %s de Prisma a %i", async (code, status, message) => {
    const app = buildApp(throwing(prismaKnownError(code)));

    const res = await request(app).get("/test");

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ ok: false, message });
  });

  it("responde 500 ante un código de Prisma no contemplado", async () => {
    const app = buildApp(throwing(prismaKnownError("P2000")));

    const res = await request(app).get("/test");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Error interno del servidor");
  });

  it("responde 503 si Prisma no se puede conectar a la base de datos", async () => {
    const error = new Prisma.PrismaClientInitializationError(
      "Can't reach database server at db.example.com:5432",
      CLIENT_VERSION
    );
    const app = buildApp(throwing(error));

    const res = await request(app).get("/test");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, message: "No se pudo conectar con la base de datos" });
    expect(res.text).not.toContain("db.example.com");
  });

  it("responde 400 en JSON si el body está mal formado", async () => {
    const app = buildApp((_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app)
      .post("/test")
      .set("Content-Type", "application/json")
      .send('{"accountNumber": }');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: "El cuerpo de la petición no es un JSON válido" });
  });

  it("responde 413 si el body excede el límite", async () => {
    const app = buildApp((_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app)
      .post("/test")
      .send({ data: "x".repeat(2000) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ ok: false, message: "El cuerpo de la petición es demasiado grande" });
  });

  it("delega a Express si la respuesta ya se empezó a enviar", () => {
    const error = new Error("Falló a medio envío");
    const res = { headersSent: true, status: vi.fn() } as unknown as Response;
    const next = vi.fn();

    errorHandler(error, {} as Request, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("notFoundHandler", () => {
  it("responde 404 en JSON con el método y la ruta", async () => {
    const app = buildApp((_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).delete("/no-existe?x=1");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, message: "Ruta DELETE /no-existe?x=1 no encontrada" });
  });
});