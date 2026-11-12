import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    exclude: [
      "e2e/**",
      ".output/**",
      ".wxt/**",
      "blueprints/**",
      "node_modules/**",
    ],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
