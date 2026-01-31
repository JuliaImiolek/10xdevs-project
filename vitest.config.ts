/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/components/**", "src/pages/api/**"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/index.ts",
      ],
    },
  },
});
