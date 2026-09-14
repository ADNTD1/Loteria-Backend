import { defineConfig } from "vitest/config";

// URL a un puerto cerrado: si alguna prueba llega a Prisma sin mock,
// falla en vez de tocar la base de datos real del .env.
const TEST_DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL
    }
  }
});