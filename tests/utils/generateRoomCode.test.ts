import { describe, expect, it } from "vitest";
import { generateRoomCode } from "../../src/utils/generateRoomCode.js";

describe("generateRoomCode", () => {
  it("genera códigos con formato AAA-XXX (3 letras, guion, 3 letras o números)", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateRoomCode()).toMatch(/^[A-Z]{3}-[A-Z0-9]{3}$/);
    }
  });

  it("genera códigos distintos entre llamadas", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));

    expect(codes.size).toBeGreaterThan(90);
  });
});