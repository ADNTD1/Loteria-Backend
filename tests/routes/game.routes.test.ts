import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app.js";
import { makeCards } from "../helpers/cards.js";

const { findAll } = vi.hoisted(() => ({ findAll: vi.fn() }));

// Reemplaza el acceso a la base de datos: estas pruebas no necesitan Postgres.
vi.mock("../../src/repositories/card.repository.js", () => ({
  CardRepository: class {
    findAll = findAll;
  }
}));

// Mocka el middleware de autenticación para que no bloquee las pruebas
vi.mock("../../src/middlewares/auth.middleware.js", () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

beforeEach(() => {
  findAll.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/game/cards", () => {
  it("devuelve todas las cartas", async () => {
    const cards = makeCards(54);
    findAll.mockResolvedValue(cards);

    const res = await request(app).get("/api/game/cards");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: cards });
  });

  it("responde 404 si no hay cartas", async () => {
    findAll.mockResolvedValue([]);

    const res = await request(app).get("/api/game/cards");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, message: "No se encontraron cartas" });
  });

  it("responde 500 genérico si falla la base de datos", async () => {
    findAll.mockRejectedValue(new Error("connection refused at db.internal:5432"));

    const res = await request(app).get("/api/game/cards");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, message: "Error interno del servidor" });
    expect(res.text).not.toContain("db.internal");
  });
});

describe("POST /api/game/board", () => {
  it("genera una tabla de 16 cartas distintas para el jugador", async () => {
    const cards = makeCards(54);
    findAll.mockResolvedValue(cards);

    const res = await request(app)
      .post("/api/game/board")
      .send({ accountNumber: "20000111" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.accountNumber).toBe("20000111");

    const ids: number[] = res.body.data.cards.map((card: { id: number }) => card.id);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(16);
    expect(ids.every((id) => id >= 1 && id <= 54)).toBe(true);
  });

  it("responde 400 si falta el accountNumber", async () => {
    const res = await request(app).post("/api/game/board").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: "El accountNumber es obligatorio" });
    expect(findAll).not.toHaveBeenCalled();
  });

  it("responde 400 si no se envía un JSON", async () => {
    const res = await request(app)
      .post("/api/game/board")
      .set("Content-Type", "text/plain")
      .send("20000111");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: "El accountNumber es obligatorio" });
  });

  it("responde 400 si el JSON está mal formado", async () => {
    const res = await request(app)
      .post("/api/game/board")
      .set("Content-Type", "application/json")
      .send('{"accountNumber": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: "El cuerpo de la petición no es un JSON válido" });
  });

  it("responde 500 genérico si hay menos de 16 cartas", async () => {
    findAll.mockResolvedValue(makeCards(10));

    const res = await request(app)
      .post("/api/game/board")
      .send({ accountNumber: "20000111" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, message: "Error interno del servidor" });
  });
});

describe("GET /api/game/shuffle", () => {
  it("devuelve el mazo completo con las mismas cartas", async () => {
    const cards = makeCards(54);
    findAll.mockResolvedValue(cards);

    const res = await request(app).get("/api/game/shuffle");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(54);
    expect(res.body.data).toEqual(expect.arrayContaining(cards));
  });

  it("responde 404 si no hay cartas", async () => {
    findAll.mockResolvedValue([]);

    const res = await request(app).get("/api/game/shuffle");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, message: "No se encontraron cartas para barajear" });
  });
});

describe("rutas inexistentes", () => {
  it("responde 404 en JSON", async () => {
    const res = await request(app).get("/api/no-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, message: "Ruta GET /api/no-existe no encontrada" });
  });
});