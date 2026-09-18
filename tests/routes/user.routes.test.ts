import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../src/app.js";
import { generateToken } from "../../src/utils/jwt.utils.js";

// Mock de Prisma para no requerir conexión real a Postgres durante los tests
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    user = {
      findUnique,
    };
  },
}));

beforeEach(() => {
  findUnique.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/users/login", () => {
  it("inicia sesión correctamente si el usuario existe", async () => {
    findUnique.mockResolvedValue({
      id: "uuid-123",
      accountNumber: "20230001",
      name: "Carlos",
      totalWins: 5,
    });

    const res = await request(app)
      .post("/api/users/login")
      .send({ accountNumber: "20230001" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.accountNumber).toBe("20230001");
    expect(res.body.data.token).toBeDefined();
  });

  it("responde 400 si falta el accountNumber", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toBe("El número de cuenta es obligatorio");
  });

  it("responde 404 si el usuario no existe", async () => {
    findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/users/login")
      .send({ accountNumber: "99999999" });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toBe("Número de cuenta no registrado en el sistema");
  });
});

describe("GET /api/users/me", () => {
  it("responde 401 si no se envía token", async () => {
    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("devuelve el perfil si se envía un token válido", async () => {
    const token = generateToken("20230001");
    findUnique.mockResolvedValue({
      id: "uuid-123",
      accountNumber: "20230001",
      name: "Carlos",
      totalWins: 5,
    });

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.accountNumber).toBe("20230001");
  });
});

describe("POST /api/users/logout", () => {
  it("cierra sesión con éxito", async () => {
    const res = await request(app)
      .post("/api/users/logout")
      .send({ accountNumber: "20230001" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe("Sesión cerrada correctamente");
  });
});