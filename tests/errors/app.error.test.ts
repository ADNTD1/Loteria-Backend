import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors/app.error.js";

describe("AppError", () => {
  it("guarda el mensaje y el statusCode", () => {
    const error = new AppError("La sala no existe", 404);

    expect(error.message).toBe("La sala no existe");
    expect(error.statusCode).toBe(404);
  });

  it("usa 500 como statusCode por defecto", () => {
    expect(new AppError("Algo falló").statusCode).toBe(500);
  });

  it("es un Error normal con nombre AppError", () => {
    const error = new AppError("Algo falló");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.stack).toBeDefined();
  });
});