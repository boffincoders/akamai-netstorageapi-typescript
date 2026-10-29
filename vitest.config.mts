import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Tests patch http.request and use process.chdir, so each file runs in its own process.
    pool: "forks",
  },
});
